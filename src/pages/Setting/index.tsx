import React, {ReactElement, ReactNode} from "react";
import {withRouter, RouteComponentProps, Switch, Route, Redirect} from "react-router-dom";
import ProfileSetting from "nomad-universal/lib/components/ProfileSetting";
import "./settings.scss";

function Settings (props: RouteComponentProps): ReactElement {
  return (
    <div className="settings">
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

export default withRouter(Settings);

function renderProfile(): ReactNode {
  return (
    <ProfileSetting />
  )
}
