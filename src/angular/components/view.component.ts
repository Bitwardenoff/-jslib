import {
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    Output,
} from '@angular/core';

import { ToasterService } from 'angular2-toaster';
import { Angulartics2 } from 'angulartics2';

import { CipherType } from '../../enums/cipherType';
import { FieldType } from '../../enums/fieldType';

import { AuditService } from '../../abstractions/audit.service';
import { CipherService } from '../../abstractions/cipher.service';
import { CryptoService } from '../../abstractions/crypto.service';
import { I18nService } from '../../abstractions/i18n.service';
import { PlatformUtilsService } from '../../abstractions/platformUtils.service';
import { TokenService } from '../../abstractions/token.service';
import { TotpService } from '../../abstractions/totp.service';

import { AttachmentView } from '../../models/view/attachmentView';
import { CipherView } from '../../models/view/cipherView';
import { FieldView } from '../../models/view/fieldView';
import { LoginUriView } from '../../models/view/loginUriView';

export class ViewComponent implements OnDestroy {
    @Input() cipherId: string;
    @Output() onEditCipher = new EventEmitter<CipherView>();

    cipher: CipherView;
    showPassword: boolean;
    showCardCode: boolean;
    isPremium: boolean;
    totpCode: string;
    totpCodeFormatted: string;
    totpDash: number;
    totpSec: number;
    totpLow: boolean;
    fieldType = FieldType;
    checkPasswordPromise: Promise<number>;

    private totpInterval: any;

    constructor(protected cipherService: CipherService, protected totpService: TotpService,
        protected tokenService: TokenService, protected toasterService: ToasterService,
        protected cryptoService: CryptoService, protected platformUtilsService: PlatformUtilsService,
        protected i18nService: I18nService, protected analytics: Angulartics2,
        protected auditService: AuditService, protected win: Window) { }

    ngOnDestroy() {
        this.cleanUp();
    }

    async load() {
        this.cleanUp();

        const cipher = await this.cipherService.get(this.cipherId);
        this.cipher = await cipher.decrypt();

        this.isPremium = this.tokenService.getPremium();

        if (this.cipher.type === CipherType.Login && this.cipher.login.totp &&
            (cipher.organizationUseTotp || this.isPremium)) {
            await this.totpUpdateCode();
            await this.totpTick();

            this.totpInterval = setInterval(async () => {
                await this.totpTick();
            }, 1000);
        }
    }

    edit() {
        this.onEditCipher.emit(this.cipher);
    }

    togglePassword() {
        this.analytics.eventTrack.next({ action: 'Toggled Password' });
        this.showPassword = !this.showPassword;
    }

    toggleCardCode() {
        this.analytics.eventTrack.next({ action: 'Toggled Card Code' });
        this.showCardCode = !this.showCardCode;
    }

    async checkPassword() {
        if (this.cipher.login == null || this.cipher.login.password == null || this.cipher.login.password === '') {
            return;
        }

        this.analytics.eventTrack.next({ action: 'Check Password' });
        this.checkPasswordPromise = this.auditService.passwordLeaked(this.cipher.login.password);
        const matches = await this.checkPasswordPromise;

        if (matches > 0) {
            this.toasterService.popAsync('warning', null, this.i18nService.t('passwordExposed', matches.toString()));
        } else {
            this.toasterService.popAsync('success', null, this.i18nService.t('passwordSafe'));
        }
    }

    toggleFieldValue(field: FieldView) {
        const f = (field as any);
        f.showValue = !f.showValue;
    }

    launch(uri: LoginUriView) {
        if (!uri.canLaunch) {
            return;
        }

        this.analytics.eventTrack.next({ action: 'Launched Login URI' });
        this.platformUtilsService.launchUri(uri.uri);
    }

    copy(value: string, typeI18nKey: string, aType: string) {
        if (value == null) {
            return;
        }

        this.analytics.eventTrack.next({ action: 'Copied ' + aType });
        const copyOptions = this.win != null ? { doc: this.win.document } : null;
        this.platformUtilsService.copyToClipboard(value, copyOptions);
        this.toasterService.popAsync('info', null,
            this.i18nService.t('valueCopied', this.i18nService.t(typeI18nKey)));
    }

    async downloadAttachment(attachment: AttachmentView) {
        const a = (attachment as any);
        if (a.downloading) {
            return;
        }

        if (this.cipher.organizationId == null && !this.isPremium) {
            this.toasterService.popAsync('error', this.i18nService.t('premiumRequired'),
                this.i18nService.t('premiumRequiredDesc'));
            return;
        }

        a.downloading = true;
        const response = await fetch(new Request(attachment.url, { cache: 'no-cache' }));
        if (response.status !== 200) {
            this.toasterService.popAsync('error', null, this.i18nService.t('errorOccurred'));
            a.downloading = false;
            return;
        }

        try {
            const buf = await response.arrayBuffer();
            const key = await this.cryptoService.getOrgKey(this.cipher.organizationId);
            const decBuf = await this.cryptoService.decryptFromBytes(buf, key);
            this.platformUtilsService.saveFile(this.win, decBuf, null, attachment.fileName);
        } catch (e) {
            this.toasterService.popAsync('error', null, this.i18nService.t('errorOccurred'));
        }

        a.downloading = false;
    }

    private cleanUp() {
        this.totpCode = null;
        this.cipher = null;
        this.showPassword = false;
        if (this.totpInterval) {
            clearInterval(this.totpInterval);
        }
    }

    private async totpUpdateCode() {
        if (this.cipher == null || this.cipher.type !== CipherType.Login || this.cipher.login.totp == null) {
            if (this.totpInterval) {
                clearInterval(this.totpInterval);
            }
            return;
        }

        this.totpCode = await this.totpService.getCode(this.cipher.login.totp);
        if (this.totpCode != null) {
            this.totpCodeFormatted = this.totpCode.substring(0, 3) + ' ' + this.totpCode.substring(3);
        } else {
            this.totpCodeFormatted = null;
            if (this.totpInterval) {
                clearInterval(this.totpInterval);
            }
        }
    }

    private async totpTick() {
        const epoch = Math.round(new Date().getTime() / 1000.0);
        const mod = epoch % 30;

        this.totpSec = 30 - mod;
        this.totpDash = +(Math.round(((2.62 * mod) + 'e+2') as any) + 'e-2');
        this.totpLow = this.totpSec <= 7;
        if (mod === 0) {
            await this.totpUpdateCode();
        }
    }
}
