//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

// A wrapper over Node's internal file system and other libraries
const glob =  require('glob');
const fs = require('fs');
const fse = require('fs-extra');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');

function nodebackToPromise(fn) {
  return (...args) => new Promise((resolve, reject) => {
    return fn(...args, (error, data) => {
      if (error)  reject(error);
      else        resolve(data);
    });
  })
}


module.exports = {
  exists: fs.existsSync,
  stat: nodebackToPromise(fs.stat),
  listDirectory: nodebackToPromise(fs.readdir),
  link: nodebackToPromise(fs.symlink),
  unlink: nodebackToPromise(fs.unlink),
  read: nodebackToPromise(fs.readFile),
  write: nodebackToPromise(fs.writeFile),
  changeMode: nodebackToPromise(fs.chmod),
  changeOwner: nodebackToPromise(fs.chown),
  makeDirectory: nodebackToPromise(mkdirp),
  glob: nodebackToPromise(glob),
  remove: nodebackToPromise(rimraf),
  copy: nodebackToPromise(fse.copy)
};
