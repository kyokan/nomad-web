import {useCallback} from "react";
import {useDispatch} from "react-redux";
import {useCurrentUsername, UsersActionType} from "nomad-universal/lib/ducks/users";
import {CustomViewProps} from "nomad-universal/lib/ducks/views";
import {DraftPost} from "nomad-universal/src/ducks/drafts/type";
import {NapiResponse, RelayerNewPostResponse} from "nomad-universal/src/utils/types";
import {mapDraftToPostPayload} from "nomad-universal/src/utils/posts";
import {INDEXER_API} from "nomad-universal/src/utils/api";
import {PostType} from "nomad-universal/src/types/posts";
import {serializeUsername} from "nomad-universal/src/utils/user";
import {createNewPost, updatePost} from "nomad-universal/src/ducks/posts";
import {getIdentity, sign} from "./localStorage";
import {Post} from "fn-client/lib/application/Post";
import {Envelope} from "fn-client/lib/application/Envelope";

export const useCreateNewView = () => {
  const dispatch = useDispatch();
  const currentUsername = useCurrentUsername();
  const getUserData = useGetUserData();

  return useCallback(async (view: CustomViewProps) => {
    const userData = await getUserData(currentUsername);
    const newUserData = extendUserData(userData, {
      savedViews: [...userData.savedViews, view],
    });
    const jsonString = JSON.stringify(newUserData);
    localStorage.setItem(`nomad-userdata:${currentUsername}`, jsonString);
    dispatch({
      type: UsersActionType.SET_CURRENT_USER_DATA,
      payload: newUserData,
    });
  }, [dispatch, currentUsername]);
};

export const useSaveCustomView = () => {
  const dispatch = useDispatch();
  const currentUsername = useCurrentUsername();
  const getUserData = useGetUserData();

  return useCallback(async (view: CustomViewProps, index: number) => {
    const userData = await getUserData(currentUsername);
    const newUserData = extendUserData(userData, {
      savedViews: userData.savedViews.map((f, i) => {
        if (i === index) {
          return view;
        }
        return f;
      }),
    });
    const jsonString = JSON.stringify(newUserData);
    localStorage.setItem(`nomad-userdata:${currentUsername}`, jsonString);
    dispatch({
      type: UsersActionType.SET_CURRENT_USER_DATA,
      payload: newUserData,
    });
  }, [dispatch, currentUsername]);
};

const useGetUserData = () => {
  return useCallback(async (username: string): Promise<UserData> => {
    try {
      const userPath = `nomad-userdata:${username}`;
      const userDataJson = localStorage.getItem(userPath) || '';

      const userData: any = JSON.parse(userDataJson);
      const {
        mutedNames = [],
        hiddenPostHashes = [],
        savedViews = [],
        updateQueue = [],
        lastFlushed = 0,
      } = userData || {};
      return {
        mutedNames: mutedNames.filter((name: any) => typeof name === 'string'),
        hiddenPostHashes: hiddenPostHashes.filter((name: any) => typeof name === 'string'),
        savedViews: savedViews.filter((filter: any) => filter),
        updateQueue: updateQueue.filter((hash: any) => typeof hash === 'string'),
        lastFlushed,
      };
    } catch (err) {
      return {
        mutedNames: [],
        hiddenPostHashes: [],
        savedViews: [],
        updateQueue: [],
        lastFlushed: 0,
      };
    }
  }, []);
};

function extendUserData(old: UserData, opts: UserDataOpts): UserData {
  return {
    mutedNames: opts.mutedNames || old.mutedNames,
    hiddenPostHashes: opts.hiddenPostHashes || old.hiddenPostHashes,
    savedViews: opts.savedViews || old.savedViews,
    lastFlushed: opts.lastFlushed || old.lastFlushed,
    updateQueue: opts.updateQueue || old.updateQueue,
  };
}

export type UserData = {
  mutedNames: string[];
  hiddenPostHashes: string[];
  savedViews: CustomViewProps[];
  lastFlushed: number;
  updateQueue: string[];
}

export type UserDataOpts = {
  mutedNames?: string[];
  hiddenPostHashes?: string[];
  savedViews?: CustomViewProps[];
  lastFlushed?: number;
  updateQueue?: string[];
}

export function useFetchCurrentUserData () {
  const dispatch = useDispatch();
  const getUserData = useGetUserData();
  const currentUsername = useCurrentUsername();

  return useCallback(async () => {
    const userData = await getUserData(currentUsername);

    dispatch({
      type: UsersActionType.SET_CURRENT_USER_DATA,
      payload: userData,
    });
  }, [dispatch, currentUsername]);
}

export const useSendPost = () => {
  const dispatch = useDispatch();

  return useCallback(async (draft: DraftPost) => {
    const payload = mapDraftToPostPayload(draft);
    const {tld} = getIdentity();
    const post = {
      title: payload.title,
      body: payload.content,
      reference: payload.parent,
      topic: payload.topic,
      tags: payload.tags,
    };

    const resp = await fetch(`${INDEXER_API}/relayer/precommit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'X-API-Token': token || '',
      },
      body: JSON.stringify({
        tld,
        post,
      }),
    });
    const json = await resp.json();
    const {refhash, sealedHash, envelope} = json.payload;
    // const msg = new Post(
    //   0,
    //   payload.content,
    //   payload.title || null,
    //   payload.parent || null,
    //   null,
    //   [],
    //   0,
    //   0,
    //   0,
    // );

    // const env = await Envelope.createWithMessage(
    //   0,
    //   tld,
    //   null,
    //   '',
    //   msg,
    // );

    // const wire =  env.toWire(0);
    const sig = sign(Buffer.from(sealedHash, 'hex'));

    const resp2 = await fetch(`${INDEXER_API}/relayer/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'X-API-Token': token || '',
      },
      body: JSON.stringify({
        tld,
        post,
        date: envelope.timestamp,
        sealedHash,
        sig: sig.toString('hex'),
        refhash,
      }),
    });

    const json2: any = await resp.json();

    if (json2.error) {
      throw new Error(json2.payload as string);
    }

    dispatch(updatePost(createNewPost({
      hash: refhash,
      id: '',
      type: PostType.ORIGINAL,
      creator: serializeUsername('', tld),
      timestamp: new Date(envelope.timestamp).getTime(),
      content: post.body,
      topic: post.topic,
      tags: post.tags,
      context: '',
      parent: post.reference,
    })));

    return json.payload;
  }, [dispatch]);
};
