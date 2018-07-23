import { FolderData } from '../models/data/folderData';

import { Folder } from '../models/domain/folder';
import { SymmetricCryptoKey } from '../models/domain/symmetricCryptoKey';

import { FolderRequest } from '../models/request/folderRequest';

import { FolderResponse } from '../models/response/folderResponse';

import { FolderView } from '../models/view/folderView';

import { ApiService } from '../abstractions/api.service';
import { CipherService } from '../abstractions/cipher.service';
import { CryptoService } from '../abstractions/crypto.service';
import { FolderService as FolderServiceAbstraction } from '../abstractions/folder.service';
import { I18nService } from '../abstractions/i18n.service';
import { StorageService } from '../abstractions/storage.service';
import { UserService } from '../abstractions/user.service';
import { CipherData } from '../models/data/cipherData';

import { Utils } from '../misc/utils';

const Keys = {
    foldersPrefix: 'folders_',
    ciphersPrefix: 'ciphers_',
};

export class FolderService implements FolderServiceAbstraction {
    decryptedFolderCache: FolderView[];

    constructor(private cryptoService: CryptoService, private userService: UserService,
        private apiService: ApiService, private storageService: StorageService,
        private i18nService: I18nService, private cipherService: CipherService) { }

    clearCache(): void {
        this.decryptedFolderCache = null;
    }

    async encrypt(model: FolderView, key?: SymmetricCryptoKey): Promise<Folder> {
        const folder = new Folder();
        folder.id = model.id;
        folder.name = await this.cryptoService.encrypt(model.name, key);
        return folder;
    }

    async get(id: string): Promise<Folder> {
        const userId = await this.userService.getUserId();
        const folders = await this.storageService.get<{ [id: string]: FolderData; }>(
            Keys.foldersPrefix + userId);
        if (folders == null || !folders.hasOwnProperty(id)) {
            return null;
        }

        return new Folder(folders[id]);
    }

    async getAll(): Promise<Folder[]> {
        const userId = await this.userService.getUserId();
        const folders = await this.storageService.get<{ [id: string]: FolderData; }>(
            Keys.foldersPrefix + userId);
        const response: Folder[] = [];
        for (const id in folders) {
            if (folders.hasOwnProperty(id)) {
                response.push(new Folder(folders[id]));
            }
        }
        return response;
    }

    async getAllDecrypted(): Promise<FolderView[]> {
        if (this.decryptedFolderCache != null) {
            return this.decryptedFolderCache;
        }

        const hasKey = await this.cryptoService.hasKey();
        if (!hasKey) {
            throw new Error('No key.');
        }

        const decFolders: FolderView[] = [];
        const promises: Array<Promise<any>> = [];
        const folders = await this.getAll();
        folders.forEach((folder) => {
            promises.push(folder.decrypt().then((f) => decFolders.push(f)));
        });

        await Promise.all(promises);
        decFolders.sort(Utils.getSortFunction(this.i18nService, 'name'));

        const noneFolder = new FolderView();
        noneFolder.name = this.i18nService.t('noneFolder');
        decFolders.push(noneFolder);

        this.decryptedFolderCache = decFolders;
        return this.decryptedFolderCache;
    }

    async saveWithServer(folder: Folder): Promise<any> {
        const request = new FolderRequest(folder);

        let response: FolderResponse;
        if (folder.id == null) {
            response = await this.apiService.postFolder(request);
            folder.id = response.id;
        } else {
            response = await this.apiService.putFolder(folder.id, request);
        }

        const userId = await this.userService.getUserId();
        const data = new FolderData(response, userId);
        await this.upsert(data);
    }

    async upsert(folder: FolderData | FolderData[]): Promise<any> {
        const userId = await this.userService.getUserId();
        let folders = await this.storageService.get<{ [id: string]: FolderData; }>(
            Keys.foldersPrefix + userId);
        if (folders == null) {
            folders = {};
        }

        if (folder instanceof FolderData) {
            const f = folder as FolderData;
            folders[f.id] = f;
        } else {
            (folder as FolderData[]).forEach((f) => {
                folders[f.id] = f;
            });
        }

        await this.storageService.save(Keys.foldersPrefix + userId, folders);
        this.decryptedFolderCache = null;
    }

    async replace(folders: { [id: string]: FolderData; }): Promise<any> {
        const userId = await this.userService.getUserId();
        await this.storageService.save(Keys.foldersPrefix + userId, folders);
        this.decryptedFolderCache = null;
    }

    async clear(userId: string): Promise<any> {
        await this.storageService.remove(Keys.foldersPrefix + userId);
        this.decryptedFolderCache = null;
    }

    async delete(id: string | string[]): Promise<any> {
        const userId = await this.userService.getUserId();
        const folders = await this.storageService.get<{ [id: string]: FolderData; }>(
            Keys.foldersPrefix + userId);
        if (folders == null) {
            return;
        }

        if (typeof id === 'string') {
            const i = id as string;
            delete folders[id];
        } else {
            (id as string[]).forEach((i) => {
                delete folders[i];
            });
        }

        await this.storageService.save(Keys.foldersPrefix + userId, folders);
        this.decryptedFolderCache = null;

        // Items in a deleted folder are re-assigned to "No Folder"
        const ciphers = await this.storageService.get<{ [id: string]: CipherData; }>(Keys.ciphersPrefix + userId);
        if (ciphers != null) {
            const updates: CipherData[] = [];
            for (const cId in ciphers) {
                if (ciphers[cId].folderId === id) {
                    ciphers[cId].folderId = null;
                    updates.push(ciphers[cId]);
                }
            }
            if (updates.length > 0) {
                this.cipherService.upsert(updates);
            }
        }
    }

    async deleteWithServer(id: string): Promise<any> {
        await this.apiService.deleteFolder(id);
        await this.delete(id);
    }
}
