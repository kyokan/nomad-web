import {useCallback} from "react";
import {useDispatch} from "react-redux";
import {useCurrentUsername, UsersActionType} from "nomad-universal/lib/ducks/users";
import {CustomViewProps} from "nomad-universal/lib/ducks/views";

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
