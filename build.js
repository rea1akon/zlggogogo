const packager = require('electron-packager');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const options = {
    dir: '.',
    name: 'ZhuangLuoGui-Management-System',
    platform: 'win32',
    arch: 'x64',
    out: 'release-tmp',
    overwrite: true,
    asar: true,
    prune: true,
    tmpdir: path.join(os.tmpdir(), 'ep-build')
};

console.log('Starting Windows executable packaging...');
console.log(`Target: ${options.platform}/${options.arch}`);
console.log(`Output: ${options.out}`);

packager(options).then(async appPaths => {
    console.log('\nPackage created in temp location.');
    
    const finalDir = path.join(__dirname, 'release');
    const tmpDir = appPaths[0];
    
    try {
        if (fs.existsSync(finalDir)) {
            fs.rmSync(finalDir, { recursive: true, force: true });
        }
        
        function copyDir(src, dest) {
            fs.mkdirSync(dest, { recursive: true });
            const entries = fs.readdirSync(src, { withFileTypes: true });
            for (const entry of entries) {
                const srcPath = path.join(src, entry.name);
                const destPath = path.join(dest, entry.name);
                if (entry.isDirectory()) {
                    copyDir(srcPath, destPath);
                } else {
                    fs.copyFileSync(srcPath, destPath);
                }
            }
        }
        
        copyDir(tmpDir, finalDir);
        
        console.log('\n=== BUILD SUCCESSFUL ===');
        console.log(`Output: ${finalDir}`);
        
        const exeFiles = [];
        function findExe(dir, results) {
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    findExe(fullPath, results);
                } else if (item.endsWith('.exe')) {
                    results.push(fullPath);
                }
            }
        }
        findExe(finalDir, exeFiles);
        
        console.log('\nExecutable files:');
        exeFiles.forEach(f => console.log(`  [EXE] ${f}`));
        
        fs.rmSync(path.join(__dirname, 'release-tmp'), { recursive: true, force: true });
        console.log('\nTemp files cleaned up.');
        
    } catch (err) {
        console.log('\nFallback: using robocopy...');
        try {
            execSync(`robocopy "${tmpDir}" "${finalDir}" /E /NFL /NDL /NJH /NJS`, { stdio: 'inherit' });
            console.log(`\nOutput: ${finalDir}`);
        } catch (e) {
            console.error('Robocopy also failed:', e.message);
        }
    }
}).catch(err => {
    console.error('Build FAILED:', err.message);
    process.exit(1);
});
