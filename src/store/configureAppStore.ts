import {createStore, applyMiddleware, combineReducers} from "redux";
import thunk from "redux-thunk";
import {createLogger} from "redux-logger";
import posts from "nomad-universal/lib/ducks/posts";
import users from "nomad-universal/lib/ducks/users";
import drafts from "nomad-universal/lib/ducks/drafts";
import replies from "nomad-universal/lib/ducks/drafts/replies";
import blocklist from "nomad-universal/lib/ducks/blocklist";
import search from "nomad-universal/lib/ducks/search";
import views from "nomad-universal/lib/ducks/views";
import app from "nomad-universal/lib/ducks/app";

const rootReducer = combineReducers({
  app,
  posts,
  users,
  drafts,
  blocklist,
  replies,
  search,
  views,
});

export type AppRootState = ReturnType<typeof rootReducer>;

export default function configureAppStore() {
  return createStore(
    rootReducer,
    process.env.NODE_ENV === 'development'
      ? applyMiddleware(thunk, createLogger({
        collapsed: (getState, action = {}) => [''].includes(action.type),
      }))
      : applyMiddleware(thunk),
  );
}

