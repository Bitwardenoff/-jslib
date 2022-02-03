import { Utils } from "../../../misc/utils";
import { CaptchaProtectedRequest } from "../captchaProtectedRequest";
import { DeviceRequest } from "../deviceRequest";

import { TokenRequest, TokenRequestTwoFactor } from "./tokenRequest";

export class PasswordTokenRequest extends TokenRequest implements CaptchaProtectedRequest {
  constructor(
    public email: string,
    public masterPasswordHash: string,
    public captchaResponse: string,
    protected twoFactor: TokenRequestTwoFactor,
    device?: DeviceRequest
  ) {
    super(twoFactor, device);
  }

  toIdentityToken(clientId: string) {
    const obj = super.toIdentityToken(clientId);

    obj.grant_type = "password";
    obj.username = this.email;
    obj.password = this.masterPasswordHash;

    if (this.captchaResponse != null) {
      obj.captchaResponse = this.captchaResponse;
    }

    return obj;
  }

  alterIdentityTokenHeaders(headers: Headers) {
    headers.set("Auth-Email", Utils.fromUtf8ToUrlB64(this.email));
  }
}
