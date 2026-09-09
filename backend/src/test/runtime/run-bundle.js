import { execFile } from 'child_process';

export function runBundle(cwd) {
    return new Promise((resolve, reject) => {
        execFile(
            process.execPath,
            ['bundle-esbuild.js'],
            {
                cwd,
                encoding: 'utf8',
                timeout: 45000,
                windowsHide: true,
                maxBuffer: 10 * 1024 * 1024,
            },
            (error, stdout, stderr) => {
                if (error && (error.killed || typeof error.code !== 'number')) {
                    error.message += `\n${stdout}\n${stderr}`;
                    reject(error);
                    return;
                }
                resolve({ status: error?.code ?? 0, stdout, stderr });
            },
        );
    });
}
