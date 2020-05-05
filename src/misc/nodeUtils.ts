import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';

export class NodeUtils {
    static mkdirpSync(targetDir: string, mode = '700', relative = false, relativeDir: string = null) {
        const initialDir = path.isAbsolute(targetDir) ? path.sep : '';
        const baseDir = relative ? (relativeDir != null ? relativeDir : __dirname) : '.';
        targetDir.split(path.sep).reduce((parentDir, childDir) => {
            const dir = path.resolve(baseDir, parentDir, childDir);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, mode);
            }
            return dir;
        }, initialDir);
    }
    static readFirstLine(fileName: string) {
        return new Promise<string>((resolve, reject) => {
            const readStream = fs.createReadStream(fileName, {encoding: 'utf8'});
            const readInterface = readline.createInterface(readStream);
            readInterface
                .on('line', line => {
                    readStream.close();
                    resolve(line);
                })
                .on('error', err => reject(err));
        });
    }
}
