import { PasswordVerificationRequest } from '../models/request/passwordVerificationRequest';

import { Verification } from '../types/verification';

export abstract class UserVerificationService {
    buildRequest: <T extends PasswordVerificationRequest> (verification: Verification,
        requestClass?: new () => T, alreadyHashed?: boolean) => Promise<T>;
    verifyUser: (verification: Verification) => Promise<boolean>;
}
