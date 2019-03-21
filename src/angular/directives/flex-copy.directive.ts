import {
    Directive,
    ElementRef,
    HostListener,
} from '@angular/core';

import { PlatformUtilsService } from '../../abstractions/platformUtils.service';

@Directive({
    selector: '[appFlexCopy]',
})
export class FlexCopyDirective {
    constructor(private el: ElementRef, private platformUtilsService: PlatformUtilsService) { }

    @HostListener('copy') onCopy() {
        if (window == null) {
            return;
        }
        let copyText = '';
        const selection = window.getSelection();
        for (let i = 0; i < selection.rangeCount; i++) {
            const range = selection.getRangeAt(i);
            const text = range.toString();

            // The selection should only contain one line of text. In some cases however, the
            // selection contains newlines and space characters from the identation of following
            // sibling nodes. To avoid copying passwords containing trailing newlines and spaces
            // that aren’t part of the password, the selection has to be trimmed.
            const stringEndPos = text.includes('\n') ? text.search(/\r?\n/) : text.length;
            copyText += text.substring(0, stringEndPos);
        }
        this.platformUtilsService.copyToClipboard(copyText, { window: window });
    }
}
