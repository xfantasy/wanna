var fs = require('fs'),
    shell = require('shelljs'),
    download = require('../utils/download.js'),
    path = require('path'),
    URL = require('url'),
    tar = require('tar'),
    idParser = require('../utils/id-parser.js');

var TMPDIR = '.install';

function install(theme) {
    shell.rm('-rf', TMPDIR);
    shell.mkdir('-p', TMPDIR);
    if (!theme) {
        var config = require(process.env.PWD + '/config.json');
        theme = config.theme;
    }

    resolveTheme(theme, function(dir) {

        validateTheme(dir);

        var theme_name = require(path.resolve(process.env.PWD, dir + '/config.json')).name;

        shell.mv(dir, path.dirname(dir) + '/' + theme_name);
        dir = path.dirname(dir) + '/' + theme_name;
        copy(dir, 'themes/');
        shell.rm('-rf', TMPDIR);
        console.log('INSTALL SUCCESS.');
    });
}

function resolveTheme(raw, cb) {
    if (fs.existsSync(raw)) {
        var st = fs.statSync(raw);
        if (st.isFile()) {
            // install <tar file>
            console.log('install <tar file>');
            decompress(raw, TMPDIR, function() {
                cb(TMPDIR + '/*');
            });
        } else if (st.isDirectory()) {
            // install <folder>
            console.log('install <folder>');
            shell.cp('-R', raw, TMPDIR + '/');
            cb(TMPDIR + '/' + path.basename(raw));
        } else {
            console.log('Illegal theme.');
            process.exit(1);
        }
    } else {
        if (/^(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/.test(raw)) {
            // install <tar url>
            console.log('install <tar url>');

            var path_to_file = TMPDIR + '/' + path.basename(URL.parse(raw).pathname);
            console.log('Downloading "' + raw + '" to "' + path_to_file + '"...');
            download(raw, path_to_file, function(err) {
                if (err) {
                    console.log('Download error: ' + err.message);
                    process.exit(1);
                }
                var target_dir = TMPDIR + '/' + path.basename(path_to_file, '.tar');
                decompress(path_to_file, target_dir, function() {
                    cb(target_dir);
                });
            });
        } else if (raw.indexOf('git') > -1) {
            // install <git repo>
            console.log('install <git repo>');
        } else {
            // install <theme@version>
            console.log('install <theme@version>');
        }
    }

    //cb(dir);
}

function copy(dir, to) {
    console.log('Copy "' + dir + '" to "' + to + '"...');
    shell.rm('-rf', to + '/' + path.basename(dir));
    shell.cp('-R', dir, to)
}

function decompress(file, to, cb) {
    if (!cb) {
        cb = function() {};
    }

    console.log('Decompressing ' + file + ' to ' + to + '...');
    fs.createReadStream(file)
      .pipe(tar.Extract({ path: to }))
      .on("error", function (err) {
          console.error("Decompress file error: ", err.message)
          process.exit(1);
      })
      .on("end", function () {
          cb(to);
      })
}

function validateTheme (dir) {
    try {
        var config = require(path.resolve(process.env.PWD, dir + '/config.json'));
    } catch (e) {
        console.error('ERROR: No config.json found or the config.json found invalid.');
        process.exit(0);
    }

    var theme_name = config.name;
    if (!theme_name) {
        console.error('ERROR: The theme name must be specified in the theme config.json.');
        process.exit(0);
    }

    var viewEngine = config.viewEngine;
    viewEngine = idParser.parse(config['viewEngine']);
    if (!viewEngine || !viewEngine.name) {
        console.error('Error: A view Engine must be specified in the theme config.json!');
        process.exit(1);
    }

    var required_dirs = ['layouts', 'assets'];
    var b = false;
    required_dirs.forEach(function(d, i) {
        if (!fs.existsSync(dir + '/' + d)) {
            console.error('Error: "' + d + '" directory cannot be found in the theme.');
            b = true;
        }
    });
    if (b) {
        process.exit(1);
    }
}

module.exports = {
    command: 'install [theme]',
    description: '\tinstall a theme. If no theme specified, the theme specified in the config.json is installed.'
                + '\n\tA theme can be:'
                + '\n\t\t<tar file>                   - wanna install path/to/theme.tar'
                + '\n\t\t<tar url>                    - wanna install http://path/to/theme.tar'
                + '\n\t\t<folder>                     - wanna install ./path/to/theme/'
                + '\n\t\t<theme name>                 - wanna install excellent'
                + '\n\t\t<theme name>@<tag>           - wanna install excellent@latest'
                + '\n\t\t<theme name>@<version>       - wanna install excellent@0.8.1'
                + '\n\t\t<theme name>@<version range> - wanna install excellent@">=0.5"'
                + '\n\t\t<git repo>                   - wanna install https://github.com/shaoshuai0102/wanna-theme-default.git',
    action: install
};
