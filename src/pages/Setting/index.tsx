import React, {ReactElement, ReactNode} from "react";
import {withRouter, RouteComponentProps, Switch, Route, Redirect} from "react-router-dom";
import ProfileSetting from "nomad-universal/lib/components/ProfileSetting";
import "./settings.scss";
import {useSendPost} from "../../utils/hooks";
import classNames from "classnames";

function Settings (props: RouteComponentProps): ReactElement {
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
      {/*<div*/}
      {/*  className={classNames("settings__nav__row", {*/}
      {/*    "settings__nav__row--active": "/settings/ui" === props.location.pathname,*/}
      {/*    "settings__nav__row--disabled": true,*/}
      {/*  })}*/}
      {/*>*/}
      {/*  General*/}
      {/*</div>*/}
      <div
        className={classNames("settings__nav__row", {
          "settings__nav__row--active": "/settings/profile" === props.location.pathname,
        })}
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
        <Route>
          <Redirect to="/settings/profile" />
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
