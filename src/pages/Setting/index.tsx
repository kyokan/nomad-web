import React, {ReactElement, ReactNode, useEffect} from "react";
import {withRouter, RouteComponentProps, Switch, Route, Redirect} from "react-router-dom";
import ProfileSetting from "nomad-universal/lib/components/ProfileSetting";
import DomainSetting from "nomad-universal/lib/components/DomainSetting";
import "./settings.scss";
import {useSendPost} from "../../utils/hooks";
import classNames from "classnames";
import {useCurrentUser, UsersActionType} from "nomad-universal/lib/ducks/users";
import {getPublicKey} from "../../utils/localStorage";
import {useDispatch} from "react-redux";

function Settings (props: RouteComponentProps): ReactElement {
  const currentUser = useCurrentUser();
  const dispatch = useDispatch();

  useEffect(() => {
    (async function () {
      if (!currentUser?.publicKey) {
        const pubkey = await getPublicKey();
        dispatch({
          type: UsersActionType.SET_USER_PUBLIC_KEY,
          payload: {
            name: currentUser?.name,
            publicKey: pubkey,
          },
        })
      }
    })()
  }, [
    currentUser?.publicKey,
    currentUser?.name,
  ]);

  return (
    <div className="settings">
      {renderNav(props)}
      {renderContent(props)}
    </div>
  )
}

export default withRouter(Settings);

function renderNav(props: RouteComponentProps): ReactNode {
  return (
    <div className="settings__nav">
      <div
        className={classNames("settings__nav__row", {
          "settings__nav__row--active": "/settings/domain" === props.location.pathname,
        })}
        onClick={() => props.history.push('/settings/domain')}
      >
        Domain
      </div>
      <div
        className={classNames("settings__nav__row", {
          "settings__nav__row--active": "/settings/profile" === props.location.pathname,
        })}
        onClick={() => props.history.push('/settings/profile')}
      >
        Profile
      </div>
    </div>
  )
}

function renderContent(props: RouteComponentProps): ReactNode {
  return (
    <div className="settings__content">
      <Switch>
        <Route path="/settings/profile">
          {renderProfile()}
        </Route>
        <Route path="/settings/domain">
          {renderDomain()}
        </Route>
        <Route>
          <Redirect to="/settings/domain" />
        </Route>
      </Switch>
    </div>
  )
}

function renderProfile(): ReactNode {
  const sendPost = useSendPost();
  return (
    <ProfileSetting sendPost={sendPost} />
  )
}

function renderDomain(): ReactNode {
  return (
    <DomainSetting />
  )
}
