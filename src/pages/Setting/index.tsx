import React, {ReactElement, ReactNode} from "react";
import {withRouter, RouteComponentProps, Switch, Route, Redirect} from "react-router-dom";
import ProfileSetting from "nomad-universal/lib/components/ProfileSetting";
import "./settings.scss";
import {useSendPost} from "../../utils/hooks";

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
  const sendPost = useSendPost();
  return (
    <ProfileSetting sendPost={sendPost} />
  )
}
