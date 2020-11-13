import cookieParser from "cookie-parser";
const WEB_ACCESS_KEY = process.env.WEB_ACCESS_KEY;

require('isomorphic-fetch');
import express from 'express';
const app = express();
import cors, {CorsOptions} from "cors";
import * as bodyParser from "body-parser";
import {
  RelayerLoginResponse,
  RelayerSignupResponse
} from "nomad-universal/lib/utils/types";
import fs from "fs";
const jsonParser = bodyParser.json();
const port = process.env.PORT || 8888;

const whitelist: {[origin: string]: boolean} = {
  'http://localhost:8080': true,
  'http://localhost:8082': true,
  'http://localhost:8888': true,
  'https://www.nmd.co': true,
  'https://api.nmd.co': true,
  'https://nmd.co': true,
  '': true,
};

const corsOptions: CorsOptions = {
  origin: function (origin= '', callback) {
    if (whitelist[origin]) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
};

app.use(cookieParser());

app.use('/', async (req, res, next) => {
  if (
    WEB_ACCESS_KEY
    && req.cookies['web-access-key'] !== WEB_ACCESS_KEY
    && !(req.originalUrl === '/access' && req.method === 'POST')
  ) {
    res.send(`
      <html>
        <body>
          <input type="password" />
          <button onclick="onClick()">Submit</button>
          <script>
            function onClick() {
              const input = document.querySelector('input');
              const opts = {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  webAccessKey: input.value,
                })
              };
              fetch('/access', opts)
                .then(resp => {
                  if (resp.status === 200) {
                    window.location.reload();
                  }
                })
            }
          </script>
        </body>
      </html>
    `);
    return;
  }
  next();
});



app.use('/', express.static('./build'));
app.use(cors(corsOptions));

app.use(async (req, res, next) => {
  if (!/\/relayer\//g.test(req.url)) {
    const buf = await fs.promises.readFile('./build/index.html');
    const html = await buf.toString('utf-8');
    res.send(html);
    return;
  }

  next();
});

app.post('/access', jsonParser, async (req, res) => {
  if (!WEB_ACCESS_KEY || req.body.webAccessKey !== WEB_ACCESS_KEY) {
    res.status(401).send('unauthorized');
    return;
  }
  res.cookie('web-access-key', req.body.webAccessKey);
  res.send('ok');
});

app.post('/dev/relayer/login', jsonParser, async (req, res) => {
  try {
    const {
      tld = '',
      subdomain = '',
      password = '',
    } = req.body;

    const resp = await fetch(`https://relayer.ddrp.network/login`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tld,
        username: subdomain,
        password,
      }),
    });

    const json: RelayerLoginResponse = await resp.json();

    if (resp.status !== 200) {
      throw new Error(json.message);
    }

    res.status(resp.status).send({payload: json});
  } catch (e) {
    res.status(500).send({
      error: true,
      payload: e.message,
    });
  }
});

app.post('/dev/relayer/users', jsonParser, async (req, res) => {
  try {
    const {
      tld = '',
      subdomain = '',
      password = '',
      email = '',
    } = req.body;

    const resp = await fetch(`https://relayer.ddrp.network/users`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tld,
        username: subdomain,
        email,
        password,
      }),
    });

    if (resp.status !== 204) {
      const json: RelayerSignupResponse = await resp.json();
      throw new Error((json as any).message);
    }

    res.status(200).send({ payload: 'ok' });
  } catch (e) {
    res.status(500).send({
      error: true,
      payload: e.message,
    });
  }
});

app.get('*', (req, res) => {
  res.redirect('/');
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Web Server listening at ${port}...`);
});
