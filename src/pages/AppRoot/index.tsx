import React, {ChangeEvent, ReactElement, ReactNode, useCallback, useEffect} from "react";
import {Redirect, Route, Switch} from "react-router";
import "../index.scss";
import "./root.scss";
import "./styles/menu.scss";
import CustomFilterView, {CustomViewContainer} from "nomad-universal/lib/components/CustomFilterView";
import UserView from "nomad-universal/lib/components/UserView";
import DiscoverView from "nomad-universal/lib/components/DiscoverView";
import {
  addIdentity,
  addUser,
  fetchUserFollowings,
  fetchUserLikes, setCurrentUser,
  useCurrentUsername,
  useFetchUser
} from "nomad-universal/lib/ducks/users";
import {useDispatch} from "react-redux";
import HomeView from "nomad-universal/lib/components/HomeView";
import Logo from "../../../static/assets/icons/logo-blue.svg";
import DiscoverPanels from "nomad-universal/lib/components/DiscoverPanels";
import UserPanels from "nomad-universal/lib/components/UserPanels";
import Onboarding, {OnboardingViewType} from "nomad-universal/lib/components/Onboarding";
import SearchView from "nomad-universal/lib/components/SearchView";
import SearchPanels from "nomad-universal/lib/components/SearchPanels";
import SavedView from "nomad-universal/lib/components/SavedView";
import SavedViewPanels from "nomad-universal/lib/components/SavedViewPanels";
import {useBlockUser, useFollowUser, useLikePage, useSendPost} from "nomad-universal/lib/ducks/posts";
import {useSendReply} from "nomad-universal/lib/ducks/drafts/replies";
import AppHeader from "nomad-universal/lib/components/AppHeader";
import {clearPK, getIdentity, isLoggedIn, setIdentity, setPK} from "../../utils/localStorage";
import {serializeUsername} from "nomad-universal/lib/utils/user";
import FollowingView from "nomad-universal/lib/components/UserView/FollowingView";
import FollowersView from "nomad-universal/lib/components/UserView/FollowersView";
import BlocksView from "nomad-universal/lib/components/UserView/BlocksView";
import {useCreateNewView, useFetchCurrentUserData, useSaveCustomView} from "../../utils/hooks";
import Settings from "../Setting";
import ComposeView from "nomad-universal/lib/components/ComposeView";
import {decrypt, encrypt} from "nomad-universal/lib/utils/key";
// import ComposeViewPanels from "nomad-universal/lib/components/ComposeViewPanels";
// import {INDEXER_API} from "nomad-universal/lib/utils/api";

export default function Root(): ReactElement {
  const dispatch = useDispatch();
  const currentUsername = useCurrentUsername();
  const fetchUser = useFetchUser();
  const fetchCurrentUserData = useFetchCurrentUserData();

  const {
    token,
    tld,
    subdomain,
  } = getIdentity();

  useEffect(() => {
    (async function onAppMount() {
      if (token) {
        await dispatch(addIdentity(tld));
      }

      if (isLoggedIn()) {
        dispatch(setCurrentUser(serializeUsername(subdomain, tld)));
      }

      if (currentUsername) {
        await fetchUser(currentUsername);
        await dispatch(fetchUserLikes(currentUsername));
        await dispatch(fetchUserFollowings(currentUsername));
      }

      await fetchCurrentUserData()
    }());
  }, [
    currentUsername,
    fetchUser,
    token,
    tld,
    subdomain,
  ]);

  const summary = renderSummary();
  const panels = renderPanels();

  return (
    <div className="app">
      <AppHeader
        logoUrl={Logo}
        // @ts-ignore
        onLogout={() => {
          clearPK();
        }}
        signupText="Add User"
        signup
      />
      <div className="content">
        <div className="content__body">
          { summary }
          { panels }
        </div>
      </div>
    </div>
  );
}


function renderSummary(): ReactNode {
  const onLikePost = useLikePage();
  const onBlockUser = useBlockUser();
  const onFollowUser = useFollowUser();
  const dispatch = useDispatch();
  const onSendReply = useSendReply();
  const onSendPost = useSendPost();

  const onTLDLogin = useCallback(async (tld: string, password: string) => {
    const {token} = getIdentity();
    const privateKey = decrypt(token!, password);
    if (!privateKey) throw new Error('Cannot decrypt token');
    setPK(privateKey!);
    dispatch(addUser(tld));
    dispatch(setCurrentUser(tld));
  }, [dispatch]);

  const onAddTLD = useCallback(async (tld: string, password: string, privateKey: string) => {
    const token = encrypt(privateKey, password);
    await setIdentity(tld, '', token);
    dispatch(addUser(tld));
    dispatch(setCurrentUser(tld));
    setPK(privateKey);
  }, [dispatch]);

  const onSearch = useCallback(async (username: string) => {
    return [];
  }, []);

  return (
    <Switch>
      <Route path="/posts/:postHash">
        <DiscoverView
          onLikePost={onLikePost}
          onSendReply={onSendReply}
          onBlockUser={onBlockUser}
          onFollowUser={onFollowUser}
        />
      </Route>
      <Route path="/users/:username/blocks">
        <BlocksView
          onFollowUser={onFollowUser}
        />
      </Route>
      <Route path="/users/:username/following">
        <FollowingView
          onFollowUser={onFollowUser}
        />
      </Route>
      <Route path="/users/:username/followers">
        <FollowersView
          onFollowUser={onFollowUser}
        />
      </Route>
      <Route path="/users/:username/:viewType?">
        <UserView
          onLikePost={onLikePost}
          onSendReply={onSendReply}
          onBlockUser={onBlockUser}
          onFollowUser={onFollowUser}
        />
      </Route>
      <Route path="/welcome-to-nomad">
        <CustomFilterView
          onLikePost={onLikePost}
          onSendReply={onSendReply}
          onBlockUser={onBlockUser}
          onFollowUser={onFollowUser}
          headerActions={[]}
          title={'Welcome To Nomad!'}
          heroImageUrl=""
          filter={{
            postedBy: ['jackychan', 'kyokan'],
            likedBy: ['jackychan', 'kyokan'],
            repliedBy: ['jackychan', 'kyokan'],
            postHashes: [],
            parentHashes: [],
            allowedTags: ['release', 'tips', 'bugs', 'announcements', '*'],
          }}
        />
      </Route>
      <Route path="/discover">
        <DiscoverView
          onLikePost={onLikePost}
          onSendReply={onSendReply}
          onBlockUser={onBlockUser}
          onFollowUser={onFollowUser}
        />
      </Route>
      <Route path="/views/:viewIndex">
        <SavedView
          onLikePost={onLikePost}
          onSendReply={onSendReply}
          onBlockUser={onBlockUser}
          onFollowUser={onFollowUser}
        />
      </Route>
      <Route path="/search">
        <SearchView
          onLikePost={onLikePost}
          onSendReply={onSendReply}
          onBlockUser={onBlockUser}
          onFollowUser={onFollowUser}
        />
      </Route>
      <Route path="/home">
        <HomeView
          onLikePost={onLikePost}
          onSendReply={onSendReply}
          onBlockUser={onBlockUser}
          onFollowUser={onFollowUser}
        />
      </Route>
      <Route path="/custom-view/:viewIndex">
        <CustomViewContainer
          onLikePost={onLikePost}
          onSendReply={onSendReply}
          onBlockUser={onBlockUser}
          onFollowUser={onFollowUser}
        />
      </Route>
      <Route path="/login/:username">
        <Onboarding
          type={OnboardingViewType.LOGIN}
          onSubdomainLogin={() => Promise.reject('not supported')}
          onSubdomainSignup={() => Promise.reject('not supported')}
          onTLDLogin={onTLDLogin}
          onSearch={onSearch}
          onAddTLD={onAddTLD}
        />
      </Route>
      <Route path="/login">
        <Onboarding
          type={OnboardingViewType.LOGIN}
          onSubdomainLogin={() => Promise.reject('not supported')}
          onSubdomainSignup={() => Promise.reject('not supported')}
          onTLDLogin={onTLDLogin}
          onSearch={onSearch}
          onAddTLD={onAddTLD}
        />
      </Route>
      <Route path="/signup">
        <Onboarding
          type={OnboardingViewType.LOGIN}
          onSubdomainLogin={() => Promise.reject('not supported')}
          onSubdomainSignup={() => Promise.reject('not supported')}
          onTLDLogin={onTLDLogin}
          onSearch={onSearch}
          onAddTLD={onAddTLD}
        />
      </Route>
      <Route path="/settings">
        <Settings />
      </Route>
      <Route path="/write">
        <ComposeView
          onFileUpload={() => Promise.reject('not supported')}
          onSendPost={onSendPost}
        />
      </Route>
      <Route>
        <Redirect to="/discover" />
      </Route>
    </Switch>
  )
}

function renderPanels(): ReactNode {
  const onCreateNewView = useCreateNewView();
  const onSaveCustomView = useSaveCustomView();
  return (
    <Switch>
      <Route path="/discover">
        <div className="panels">
          <DiscoverPanels />
        </div>
      </Route>
      <Route path="/views/:viewIndex">
        <div className="panels">
        <SavedViewPanels
          onUpdateView={onSaveCustomView}
        />
        </div>
      </Route>
      <Route path="/search">
        <div className="panels">
        <SearchPanels
          onCreateNewView={onCreateNewView}
        />
        </div>
      </Route>
      <Route path="/home">
        <div className="panels" />
      </Route>
      <Route path="/posts/:postHash">
        <div className="panels" />
      </Route>
      <Route path="/users/:username">
        <div className="panels">
          <UserPanels />
        </div>
      </Route>
      {/*<Route path="/write">*/}
      {/*  <div className="panels">*/}
      {/*    <ComposeViewPanels*/}

      {/*    />*/}
      {/*  </div>*/}
      {/*</Route>*/}
    </Switch>
  )
}
