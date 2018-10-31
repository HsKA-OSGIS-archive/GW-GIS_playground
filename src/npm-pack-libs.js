/* eslint-disable */
var fs = require('fs');
var cp = require('child_process');

fs.readFile('./package.json', { encoding: 'utf8' }, function (err, data) {
    var json = JSON.parse(data);
    for (var packageName in json.dependencies) {
        var version = json.dependencies[packageName].replace(/~|\^/g, '');
        var packageInstallation = packageName + '@' + version;
        var targetFolder = './resources/lib/geostyler-libs/';
        var target = targetFolder + packageName;
        var pack = 'npm pack ' + packageInstallation;
        var tar = 'xargs tar -xzvf';
        var move = 'mv -f ./package ' + target;
        var pkgPath = cp.execSync(pack);
        console.log('Packing library ' + packageInstallation);
        // create targetfolder if it does not exist yet
        cp.execSync('mkdir -p ' + targetFolder);
        cp.execSync('rm -rf ' + target);
        cp.execSync(tar + pkgPath);
        cp.execSync(move);
        cp.execSync('rm ' + pkgPath);
    }
});
