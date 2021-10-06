import { FieldType } from '../../enums/fieldType';

import { FieldApi } from '../api/fieldApi';

export class FieldData {
    type: FieldType;
    name: string;
    value: string;
    linkedId: number;

    constructor(response?: FieldApi) {
        if (response == null) {
            return;
        }
        this.type = response.type;
        this.name = response.name;
        this.value = response.value;
        this.linkedId = response.linkedId;
    }
}
