import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from "@angular/router";

import { AuthService } from "jslib-common/abstractions/auth.service";
import { KeyConnectorService } from "jslib-common/abstractions/keyConnector.service";
import { MessagingService } from "jslib-common/abstractions/messaging.service";
import { AuthenticationStatus } from "jslib-common/enums/authenticationStatus";

import { BaseGuard } from "./base.guard";

@Injectable()
export class AuthGuard extends BaseGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    router: Router,
    private messagingService: MessagingService,
    private keyConnectorService: KeyConnectorService
  ) {
    super(router);
  }

  async canActivate(route: ActivatedRouteSnapshot, routerState: RouterStateSnapshot) {
    const authStatus = await this.authService.getAuthStatus();

    if (authStatus === AuthenticationStatus.LoggedOut) {
      this.messagingService.send("authBlocked", { url: routerState.url });
      return false;
    }

    if (authStatus === AuthenticationStatus.Locked) {
      if (routerState != null) {
        this.messagingService.send("lockedUrl", { url: routerState.url });
      }
      return this.redirect("lock", { queryParams: { promptBiometric: true } });
    }

    if (
      !routerState.url.includes("remove-password") &&
      (await this.keyConnectorService.getConvertAccountRequired())
    ) {
      return this.redirect("/remove-password");
    }

    return true;
  }
}
