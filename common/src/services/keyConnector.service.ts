import { ApiService } from '../abstractions/api.service';
import { CryptoService } from '../abstractions/crypto.service';
import { EnvironmentService } from '../abstractions/environment.service';
import { KeyConnectorService as KeyConnectorServiceAbstraction } from '../abstractions/keyConnector.service';
import { LogService } from '../abstractions/log.service';
import { StorageService } from '../abstractions/storage.service';
import { UserService } from '../abstractions/user.service';

import { OrganizationUserType } from '../enums/organizationUserType';

import { Utils } from '../misc/utils';

import { SymmetricCryptoKey } from '../models/domain/symmetricCryptoKey';

import { KeyConnectorUserKeyRequest } from '../models/request/keyConnectorUserKeyRequest';

const Keys = {
    usesKeyConnector: 'usesKeyConnector',
};

export class KeyConnectorService implements KeyConnectorServiceAbstraction {
    private usesKeyConnector: boolean = false;

    constructor(private storageService: StorageService, private userService: UserService,
        private cryptoService: CryptoService, private apiService: ApiService,
        private environmentService: EnvironmentService, private logService: LogService) { }

    setUsesKeyConnector(usesKeyConnector: boolean) {
        this.usesKeyConnector = usesKeyConnector;
        return this.storageService.save(Keys.usesKeyConnector, usesKeyConnector);
    }

    async getUsesKeyConnector(): Promise<boolean> {
        return this.usesKeyConnector ??= await this.storageService.get<boolean>(Keys.usesKeyConnector);
    }

    async userNeedsMigration() {
        const managingOrganization = await this.getManagingOrganization();
        const userIsNotExempt = managingOrganization?.type !== OrganizationUserType.Owner
            && managingOrganization?.type !== OrganizationUserType.Admin;
        const userIsNotUsingKeyConnector = !await this.getUsesKeyConnector();

        return userIsNotExempt && userIsNotUsingKeyConnector;
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
        return orgs.find(o => o.usesKeyConnector);
    }
}
