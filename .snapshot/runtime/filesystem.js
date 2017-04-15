//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

module.exports = (furipota) => {
  const glob = require('glob');
  const fs = require('fs');
  const fse = require('fs-extra');
  const path = require('path');
  const mkdir = require('mkdirp');
  const rimraf = require('rimraf');
  const { compact } = require('./utils')(furipota);
  const { 'from-text': intoPath } = require('./path')(furipota);

  const { primitive, stream, assertType } = furipota;  


  const globP = (pattern, options = {}) => {
    return new Promise((resolve, reject) => {
      glob(pattern, options, (error, files) => {
        if (error)  reject(error);
        else        resolve(files);
      });
    });
  };

  const statP = (path) => {
    return new Promise((resolve, reject) => {
      fs.stat(path, (error, stats) => {
        if (error)  reject(error);
        else        resolve(stats);
      });
    });
  };

  const mkdirP = (path, options = {}) => {
    return new Promise((resolve, reject) => {
      mkdir(path, options, (error, made) => {
        if (error)  reject(error);
        else        resolve(!!made);
      });
    });
  };

  const rmP = (path, options = {}) => {
    return new Promise((resolve, reject) => {
      rimraf(path, options, (error) => {
        if (error)  reject(error);
        else        resolve(path);
      });
    }); 
  };

  const copyP = (from, to, options = {}) => {
    return new Promise((resolve, reject) => {
      fse.copy(from, to, options, (error) => {
        if (error)  reject(error);
        else        resolve(to);
      });
    })
  };



  const globFuripota = async (pattern, options) => {
    const baseDir = options['base-directory'] || process.cwd();
    const files = await globP(pattern, compact({
      cwd: options['base-directory'],
      silent: options['silent'],
      strict: options['strict'],
      nodir: !options['match-directories'],
      ignore: options['ignore'],
      follow: options['follow-symlinks'],
      absolute: options['return-absolute-paths']
    }));

    return Promise.all(files.map(async (file) => {
      const stats = await statP(path.join(baseDir, file));
      return {
        path: intoPath(null, file),
        'created-at': stats.ctime,
        'updated-at': stats.mtime,
        type: fileType(stats)
      };
    }));
  };

  const fileType = (stats) => {
    return stats.isFile()            ?  'file'
    :      stats.isDirectory()       ?  'directory'
    :      stats.isBlockDevice()     ?  'block-device'
    :      stats.isCharacterDevice() ?  'character-device'
    :      stats.isSymbolicLink()    ?  'symlink'
    :      stats.isFIFO()            ?  'fifo'
    :      stats.isSocket()          ?  'socket'
    :      /* else */                   'unknown';
  };


  return {
    find: (vm, glob, options) => {
      return furipota.stream(async (producer) => {
        try {
          const files = await globFuripota(glob, options);

          for (const file of files) {
            await producer.pushValue(file);
          }

          producer.close();
        } catch (error) {
          await producer.pushError(error);
          producer.close();
        }
      });
    },

    'make-directory': (vm, path, options) => {
      assertType('Filesystem.make-directory <path>', '^Path', path);
      if ('mode' in options) {
        assertType('Filesystem.make-directory _ mode: <X>', 'Number', options.mode);
      }

      return stream(async (producer) => {
        try {
          const made = await mkdirP(path.value._fullpath, compact({ mode: options.mode }));
          await producer.pushValue(made);
          await producer.close();
        } catch (error) {
          await producer.pushError(error);
          await producer.close();
        }
      }, 'make-directory');
    },

    'remove': (vm, path, options) => {
      assertType('Filesystem.remove <path>', '^Path', path);

      return stream(async (producer) => {
        try {
          await rmP(path.value._fullpath, { disableGlob: true });
          await producer.close();
        } catch (error) {
          await producer.pushError(error);
          await producer.close();
        }
      });
    },

    'copy': (vm, path, options) => {
      assertType('Filesystem.copy <path>', '^Path', path);
      assertType('Filesystem.copy _ to: <path>', '^Path', options.to);
      if ('overwrite' in options) {
        assertType('Filesystem.copy _ overwrite: <X>', 'Boolean', options.overwrite);
      }
    
      return stream(async (producer) => {
        try {
          await copyP(path.value._fullpath, options.to.value._fullpath, compact({ overwrite: options.overwrite }));
          await producer.pushValue({ from: path, to: options.to });
          await producer.close();
        } catch (error) {
          await producer.pushError(error);
          await producer.close();
        }
      }, 'copy');
    }
  };
};

