import { Base64 } from 'js-base64';
import { isPlainObject } from '@/utils';

export function parseBackupContent(input) {
    if (typeof input !== 'string') {
        throw new Error('备份内容必须为 JSON 或 Base64 编码的字符串');
    }

    let content;
    try {
        content = JSON.parse(input.trim());
    } catch {
        try {
            content = JSON.parse(Base64.decode(input.trim()).trim());
        } catch {
            throw new Error('备份内容不是有效的 JSON 或 Base64 编码的 JSON');
        }
    }

    if (!isPlainObject(content) || !isPlainObject(content.settings)) {
        throw new Error('备份文件应为包含 settings 对象的 JSON 对象');
    }
    return content;
}
