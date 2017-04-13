//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const glob = require('glob');
const fs = require('fs');
const path = require('path');


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
      path: file,
      'created-at': stats.ctime,
      'updated-at': stats.mtime,
      type: fileType(stats)
    };
  }));
};


const compact = (object) => {
  const result = {};
  Object.keys(object).forEach(key => {
    const value = object[key];
    if (value !== undefined) {
      result[key] = value;
    }
  });
  return result;
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



module.exports = (furipota) => {
  return {
    files: (vm, glob, options) => {
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
    }
  };
};

