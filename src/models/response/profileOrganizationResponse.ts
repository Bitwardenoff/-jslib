import { BaseResponse } from './baseResponse';

import { PermissionsInterface } from '../interfaces/permissions';

import { OrganizationUserStatusType } from '../../enums/organizationUserStatusType';
import { OrganizationUserType } from '../../enums/organizationUserType';

export class ProfileOrganizationResponse extends BaseResponse implements PermissionsInterface {
    id: string;
    name: string;
    usePolicies: boolean;
    useGroups: boolean;
    useDirectory: boolean;
    useEvents: boolean;
    useTotp: boolean;
    use2fa: boolean;
    useApi: boolean;
    useBusinessPortal: boolean;
    useSso: boolean;
    selfHost: boolean;
    usersGetPremium: boolean;
    seats: number;
    maxCollections: number;
    maxStorageGb?: number;
    key: string;
    status: OrganizationUserStatusType;
    type: OrganizationUserType;
    enabled: boolean;
    ssoBound: boolean;
    identifier: string;
    accessBusinessPortal: boolean;
    accessEventLogs: boolean;
    accessImportExport: boolean;
    accessReports: boolean;
    manageAllCollections: boolean;
    manageAssignedCollections: boolean;
    manageCiphers: boolean;
    manageGroups: boolean;
    managePolicies: boolean;
    manageUsers: boolean;

    constructor(response: any) {
        super(response);
        this.id = this.getResponseProperty('Id');
        this.name = this.getResponseProperty('Name');
        this.usePolicies = this.getResponseProperty('UsePolicies');
        this.useGroups = this.getResponseProperty('UseGroups');
        this.useDirectory = this.getResponseProperty('UseDirectory');
        this.useEvents = this.getResponseProperty('UseEvents');
        this.useTotp = this.getResponseProperty('UseTotp');
        this.use2fa = this.getResponseProperty('Use2fa');
        this.useApi = this.getResponseProperty('UseApi');
        this.useBusinessPortal = this.getResponseProperty('UseBusinessPortal');
        this.useSso = this.getResponseProperty('UseSso');
        this.selfHost = this.getResponseProperty('SelfHost');
        this.usersGetPremium = this.getResponseProperty('UsersGetPremium');
        this.seats = this.getResponseProperty('Seats');
        this.maxCollections = this.getResponseProperty('MaxCollections');
        this.maxStorageGb = this.getResponseProperty('MaxStorageGb');
        this.key = this.getResponseProperty('Key');
        this.status = this.getResponseProperty('Status');
        this.type = this.getResponseProperty('Type');
        this.enabled = this.getResponseProperty('Enabled');
        this.ssoBound = this.getResponseProperty('SsoBound');
        this.identifier = this.getResponseProperty('Identifier');
        this.accessBusinessPortal = this.getResponseProperty('AccessBusinessPortal');
        this.accessEventLogs = this.getResponseProperty('AccessEventLogs');
        this.accessImportExport = this.getResponseProperty('AccessImportExport');
        this.accessReports = this.getResponseProperty('AccessReports');
        this.manageAllCollections = this.getResponseProperty('ManageAllCollections');
        this.manageAssignedCollections = this.getResponseProperty('ManageAssignedCollections');
        this.manageCiphers = this.getResponseProperty('ManageCiphers');
        this.manageGroups = this.getResponseProperty('ManageGroups');
        this.managePolicies = this.getResponseProperty('ManagePolicies');
        this.manageUsers = this.getResponseProperty('ManageUsers');
    }
}
