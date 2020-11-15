import {useCallback} from "react";
import {shallowEqual, useDispatch, useSelector} from "react-redux";
import {
  addUserBlocks,
  addUserFollowings,
  addUserLikes,
  useCurrentUser,
  useCurrentUsername,
  useFetchBlobInfo,
  User,
  UsersActionType,
} from "nomad-universal/lib/ducks/users";
import {CustomViewProps} from "nomad-universal/lib/ducks/views";
import {DraftPost} from "nomad-universal/lib/ducks/drafts/type";
import {mapDraftToPostPayload} from "nomad-universal/lib/utils/posts";
import {INDEXER_API} from "nomad-universal/lib/utils/api";
import {PostType} from "nomad-universal/lib/types/posts";
import {serializeUsername} from "nomad-universal/lib/utils/user";
import {addLikeCount, appendNewComment, createNewPost, updatePost} from "nomad-universal/lib/ducks/posts";
import {getIdentity, sign} from "./localStorage";
import {setSendingReplies, useReplies} from "nomad-universal/lib/ducks/drafts/replies";
import {AppRootState} from "../store/configureAppStore";

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
  const currentUser: User = useCurrentUser();
  const fetchBlobInfo = useFetchBlobInfo();

  return useCallback(async (draft: DraftPost, truncate?) => {
    await fetchBlobInfo(currentUser.name);
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
        offset: currentUser.currentBlobOffset,
        truncate,
      }),
    });
    const json = await resp.json();
    const {refhash, sealedHash, envelope} = json.payload;
    const sig = sign(Buffer.from(sealedHash, 'hex'));

    const resp2 = await fetch(`${INDEXER_API}/relayer/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tld,
        post,
        date: envelope.timestamp,
        sealedHash,
        sig: sig.toString('hex'),
        refhash,
        offset: currentUser.currentBlobOffset,
        truncate,
      }),
    });

    const json2: any = await resp2.json();

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
  }, [
    dispatch,
    currentUser.currentBlobOffset,
    currentUser.name,
    fetchBlobInfo,
  ]);
};

export const useSendReply = () => {
  const dispatch = useDispatch();

  const currentUser: User = useCurrentUser();
  const fetchBlobInfo = useFetchBlobInfo();
  const replies = useSelector((state: AppRootState): { [p: string]: DraftPost}  => {
    return state.replies.map;
  }, shallowEqual);

  return useCallback(async (id: string) => {
    dispatch(setSendingReplies(true));
    await fetchBlobInfo(currentUser.name);

    const reply = replies[id];

    if (!reply) {
      dispatch(setSendingReplies(false));
      return Promise.reject(new Error('no reply'));
    }

    const payload = mapDraftToPostPayload(reply);
    const {tld} = getIdentity();
    const post = {
      title: payload.title,
      body: payload.content,
      reference: payload.parent,
      topic: payload.topic,
      tags: payload.tags,
    };

    const {refhash, sealedHash, envelope} = await precommit({
      tld,
      post,
      offset: currentUser.currentBlobOffset,
    });

    const sig = sign(Buffer.from(sealedHash, 'hex'));

    const res = await commit({
      tld,
      post,
      date: envelope.timestamp,
      sealedHash,
      sig: sig.toString('hex'),
      refhash,
      offset: currentUser.currentBlobOffset,
    });

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

    dispatch(appendNewComment(post.reference, refhash, true));
    dispatch(setSendingReplies(false));
    return res;
  }, [
    dispatch,
    currentUser.currentBlobOffset,
    currentUser.name,
    fetchBlobInfo,
    replies,
  ]);
};

export const useFollowUser = () => {
  const dispatch = useDispatch();
  const currentUser: User = useCurrentUser();
  const fetchBlobInfo = useFetchBlobInfo();

  return useCallback(async (connecteeTLD: string) => {
    dispatch(setSendingReplies(true));
    const {tld} = getIdentity();
    await fetchBlobInfo(tld);

    const connection = {
      type: 'FOLLOW',
      tld: connecteeTLD,
    };

    const {refhash, sealedHash, envelope} = await precommit({
      tld,
      connection,
      offset: currentUser.currentBlobOffset,
    });

    const sig = sign(Buffer.from(sealedHash, 'hex'));

    const res = await commit({
      tld,
      connection,
      date: envelope.timestamp,
      sealedHash,
      sig: sig.toString('hex'),
      refhash,
      offset: currentUser.currentBlobOffset,
    });

    dispatch(addUserFollowings(tld, {
      [connecteeTLD]: connecteeTLD,
    }));
    return res;
  }, [
    dispatch,
    currentUser.currentBlobOffset,
    currentUser.name,
    fetchBlobInfo,
  ]);
};

export const useBlockUser = () => {
  const dispatch = useDispatch();
  const currentUser: User = useCurrentUser();
  const fetchBlobInfo = useFetchBlobInfo();

  return useCallback(async (blockeeTLD: string) => {
    dispatch(setSendingReplies(true));
    const {tld} = getIdentity();
    await fetchBlobInfo(tld);

    const connection = {
      type: 'BLOCK',
      tld: blockeeTLD,
    };

    const {refhash, sealedHash, envelope} = await precommit({
      tld,
      connection,
      offset: currentUser.currentBlobOffset,
    });

    const sig = sign(Buffer.from(sealedHash, 'hex'));

    const res = await commit({
      tld,
      connection,
      date: envelope.timestamp,
      sealedHash,
      sig: sig.toString('hex'),
      refhash,
      offset: currentUser.currentBlobOffset,
    });

    dispatch(addUserBlocks(currentUser.name, {
      [tld]: blockeeTLD,
    }));
    return res;
  }, [
    dispatch,
    currentUser.currentBlobOffset,
    currentUser.name,
    fetchBlobInfo,
  ]);
};


export const useLikePost = () => {
  const dispatch = useDispatch();
  const currentUser: User = useCurrentUser();
  const fetchBlobInfo = useFetchBlobInfo();

  return useCallback(async (reference: string) => {
    await fetchBlobInfo(currentUser.name);
    const {tld} = getIdentity();
    const moderation = {
      reference,
      type: 'LIKE',
    };

    const resp = await fetch(`${INDEXER_API}/relayer/precommit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'X-API-Token': token || '',
      },
      body: JSON.stringify({
        tld,
        moderation,
        offset: currentUser.currentBlobOffset,
      }),
    });
    const json = await resp.json();
    const {refhash, sealedHash, envelope} = json.payload;
    const sig = sign(Buffer.from(sealedHash, 'hex'));

    const resp2 = await fetch(`${INDEXER_API}/relayer/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tld,
        moderation,
        offset: currentUser.currentBlobOffset,
        sig: sig.toString('hex'),
        // precommit data
        date: envelope.timestamp,
        sealedHash,
        refhash,
      }),
    });

    const json2: any = await resp2.json();

    if (json2.error) {
      throw new Error(json2.payload as string);
    }

    dispatch(addUserLikes(
      tld,
      {
        [reference]: reference,
      }
    ));

    dispatch(addLikeCount(reference, 1));

    return json.payload;
  }, [
    dispatch,
    currentUser.currentBlobOffset,
    currentUser.name,
    fetchBlobInfo,
  ]);
};

async function precommit(body: object) {
  const resp = await fetch(`${INDEXER_API}/relayer/precommit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 'X-API-Token': token || '',
    },
    body: JSON.stringify(body),
  });
  const json = await resp.json();
  return json.payload;
}

async function commit(body: object) {
  const resp2 = await fetch(`${INDEXER_API}/relayer/commit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json2: any = await resp2.json();

  if (json2.error) {
    throw new Error(json2.payload as string);
  }

  return json2.payload;
}
