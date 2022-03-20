import { Injectable } from "@angular/core";
import { CanActivate, Router } from "@angular/router";

import { StateService } from "jslib-common/abstractions/state.service";
import { VaultTimeoutService } from "jslib-common/abstractions/vaultTimeout.service";

import { BaseGuardService } from "./base-guard.service";

@Injectable()
export class LockGuardService extends BaseGuardService implements CanActivate {
  protected homepage = "vault";
  protected loginpage = "login";
  constructor(
    protected router: Router,
    private vaultTimeoutService: VaultTimeoutService,
    private stateService: StateService
  ) {
    super(router);
  }

  async canActivate() {
    if (await this.vaultTimeoutService.isLocked()) {
      return true;
    }

    const redirectUrl = (await this.stateService.getIsAuthenticated())
      ? [this.homepage]
      : [this.loginpage];

    return this.redirect(redirectUrl);
  }
}
