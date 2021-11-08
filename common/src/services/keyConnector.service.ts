import { ApiService } from '../abstractions/api.service';
import { CryptoService } from '../abstractions/crypto.service';
import { EnvironmentService } from '../abstractions/environment.service';
import { KeyConnectorService as KeyConnectorServiceAbstraction } from '../abstractions/keyConnector.service';
import { LogService } from '../abstractions/log.service';
import { StorageService } from '../abstractions/storage.service';
import { TokenService } from '../abstractions/token.service';
import { UserService } from '../abstractions/user.service';

import { OrganizationUserType } from '../enums/organizationUserType';

import { Utils } from '../misc/utils';

import { SymmetricCryptoKey } from '../models/domain/symmetricCryptoKey';

import { KeyConnectorUserKeyRequest } from '../models/request/keyConnectorUserKeyRequest';

const Keys = {
    usesKeyConnector: 'usesKeyConnector',
    convertAccountToKeyConnector: 'convertAccountToKeyConnector',
};

export class KeyConnectorService implements KeyConnectorServiceAbstraction {
    private usesKeyConnector: boolean = false;

    constructor(private storageService: StorageService, private userService: UserService,
        private cryptoService: CryptoService, private apiService: ApiService,
        private environmentService: EnvironmentService, private tokenService: TokenService,
        private logService: LogService) { }

    setUsesKeyConnector(usesKeyConnector: boolean) {
        this.usesKeyConnector = usesKeyConnector;
        return this.storageService.save(Keys.usesKeyConnector, usesKeyConnector);
    }

    async getUsesKeyConnector(): Promise<boolean> {
        return this.usesKeyConnector ??= await this.storageService.get<boolean>(Keys.usesKeyConnector);
    }

    async userNeedsMigration() {
        const loggedInUsingSso = this.tokenService.getIsExternal();
        const requiredByOrganization = await this.getManagingOrganization() != null;
        const userIsNotUsingKeyConnector = !await this.getUsesKeyConnector();

        return loggedInUsingSso && requiredByOrganization && userIsNotUsingKeyConnector;
    }

    async migrateUser() {
        const organization = await this.getManagingOrganization();
        const key = await this.cryptoService.getKey();

        try {
            const keyConnectorRequest = new KeyConnectorUserKeyRequest(key.encKeyB64);
            await this.apiService.postUserKeyToKeyConnector(organization.keyConnectorUrl, keyConnectorRequest);
        } catch (e) {
            throw new Error('Unable to reach key connector');
        }

        await this.apiService.postConvertToKeyConnector();
    }

    async getAndSetKey(url?: string) {
        if (url == null) {
            url = this.environmentService.getKeyConnectorUrl();
        }

        if (url == null) {
            throw new Error('No Key Connector URL found.');
        }

        try {
            const userKeyResponse = await this.apiService.getUserKeyFromKeyConnector(url);
            const keyArr = Utils.fromB64ToArray(userKeyResponse.key);
            const k = new SymmetricCryptoKey(keyArr);
            await this.cryptoService.setKey(k);
        } catch (e) {
            this.logService.error(e);
            throw new Error('Unable to reach key connector');
        }
    }

    async getManagingOrganization() {
        const orgs = await this.userService.getAllOrganizations();
        return orgs.find(o =>
            o.usesKeyConnector &&
            o.type !== OrganizationUserType.Admin &&
            o.type !== OrganizationUserType.Owner &&
            !o.isProviderUser);
    }

    async setConvertAccountRequired(status: boolean) {
        await this.storageService.save(Keys.convertAccountToKeyConnector, status);
    }

    async getConvertAccountRequired(): Promise<boolean> {
        return await this.storageService.get(Keys.convertAccountToKeyConnector);
    }

    async removeConvertAccountRequired() {
        await this.storageService.remove(Keys.convertAccountToKeyConnector);
    }

    async clear() {
        await this.removeConvertAccountRequired();
    }
}
