var tm = process.binding('tm');


function _isFile (pathname)
{
  return tm.fs_type(pathname) == tm.FS_TYPE_FILE;
}

function _isDirectory (pathname)
{
  return tm.fs_type(pathname) == tm.FS_TYPE_DIR;
}

function _isDirEmpty (pathname)
{
  var _ = tm.fs_dir_open(pathname)
    , dir = _[0]
    , err = _[1];
  if (err) {
    return 0;
  }

  while (true) {
    var _ = tm.fs_dir_read(dir)
      , ent = _[0]
      , err = _[1];

    if (err || !ent) {
      return true;
    }
    if (ent == '.' || ent == '..') {
      continue;
    }

    if (!err && ent != undefined) {
      return false;
    }
    return true;
  }
}


function readFileSync (pathname, options)
{
  var _ = tm.fs_open(pathname, tm.OPEN_EXISTING | tm.RDONLY)
    , fd = _[0]
    , err = _[1];
  if (err || fd == undefined) {
    throw 'ENOENT: Could not open file ' + pathname;
  }

  var encoding = options && options.encoding;
  if (typeof options == 'string') {
    encoding = options;
  }

  var res = [];
  while (true) {
    if (tm.fs_readable(fd) != 0) {
      var len = 16*1024;
      var _ = tm.fs_read(fd, len)
        , buf = _[0]
        , err = _[1];
      if (!err && buf && buf.length > 0) {
        res.push(buf);
      }
      if (err || !buf || buf.length < len) {
        break;
      }
    }
  }
  tm.fs_close(fd);
  
  var buf = Buffer.concat(res);
  if (encoding) {
    return buf.toString(encoding);
  } else {
    return buf;
  }
};


exports.readdirSync = function (pathname) {
  var _ = tm.fs_dir_open(pathname)
    , dir = _[0]
    , err = _[1];
  if (err) {
    throw 'ENOENT: Could not open directory ' + pathname;
  }

  var entries = [];
  while (true) {
    var _ = tm.fs_dir_read(dir)
      , ent = _[0]
      , err = _[1];
    // todo throw on err
    if (err || ent == undefined) {
      break;
    }

    if (ent != '.' && ent != '..') {
      entries.push(ent);
    }
  }
  tm.fs_dir_close(dir);
  return entries;
};


function readdirSync (pathname)
{
  var _ = tm.fs_dir_open(pathname)
    , dir = _[0]
    , err = _[1];
  if (err) {
    throw 'ENOENT: Could not open directory ' + pathname;
  }

  var entries = [];
  while (true) {
    var _ = tm.fs_dir_read(dir)
      , ent = _[0]
      , err = _[1];
    // todo throw on err
    if (err || ent == undefined) {
      break;
    }

    if (ent != '.' && ent != '..') {
      entries.push(ent);
    }
  }
  tm.fs_dir_close(dir);
  return entries;
};


function readdir (pathname, next)
{
  setImmediate(function () {
    next(null, exports.readdirSync(pathname));
  })
}


function readFile (pathname, options, next)
{
  if (typeof options == 'function') {
    next = options;
    options = {};
  }

  setImmediate(function () {
    next(null, exports.readFileSync(pathname, options));
  });
}


function writeFileSync (pathname, data)
{
  if (!Buffer.isBuffer(data)) {
    data = new Buffer(String(data));
  }

  var _ = tm.fs_open(pathname, tm.CREATE_ALWAYS | tm.WRONLY, 0644)
    , fd = _[0]
    , err = _[1];
  if (err || fd == undefined) {
    throw 'ENOENT: Could not open file ' + pathname;
  }

  var ret = tm.fs_write(fd, data, data.length);
  tm.fs_close(fd);
}


function appendFileSync (pathname, data)
{
  if (!Buffer.isBuffer(data)) {
    data = new Buffer(String(data));
  }

  var _ = tm.fs_open(pathname, tm.OPEN_EXISTING | tm.APPEND | tm.WRONLY, 0644)
    , fd = _[0]
    , err = _[1];
  if (err || fd == undefined) {
    throw new Error('ENOENT: Could not open file ' + pathname);
  }

  // SEEK TO END OF FILE
  var len = tm.fs_length(fd)
  tm.fs_seek(fd, tm.fs_length(fd));

  var ret = tm.fs_write(fd, data, data.length);
  tm.fs_close(fd);
}


function renameSync (oldname, newname)
{
  var err = tm.fs_rename(oldname, newname);
  if (err) {
    throw new Error('ENOENT: Could not rename file ' + oldname);
  }
}


function truncateSync (pathname)
{
  var _ = tm.fs_open(pathname, tm.OPEN_ALWAYS | tm.WRONLY, 0644)
    , fd = _[0]
    , err = _[1];
  if (err || fd == undefined) {
    throw new Error('ENOENT: Could not open file ' + pathname);
  }

  var ret = tm.fs_truncate(fd);
  tm.fs_close(fd);
}


function unlinkSync (pathname)
{
  if (!_isFile(pathname)) {
    throw new Error('EPERM: Cannot unlink non-file ' + pathname)
  }

  var err = tm.fs_destroy(pathname);
  if (err) {
    throw new Error('ENOENT: Could not unlink file ' + pathname);
  }
}


function mkdirSync (pathname)
{
  var err = tm.fs_dir_create(pathname);
  if (err) {
    throw new Error('ENOENT: Unsuccessful creation of file ' + pathname);
  }
}


function rmdirSync (pathname)
{
  if (!_isDirectory(pathname)) {
    throw new Error('EPERM: Cannot rmdir non-dir ' + pathname)
  }
  if (!_isDirEmpty(pathname)) {
    throw new Error('ENOENT: Cannot remove non-empty directory ' + pathname);
  }
  
  var err = tm.fs_destroy(pathname);
  if (err) {
    throw new Error('ENOENT: Could not rmdir ' + pathname);
  }
}


function existsSync (pathname, data)
{
  if (!Buffer.isBuffer(data)) {
    data = new Buffer(String(data));
  }

  var _ = tm.fs_open(pathname, tm.RDONLY)
    , fd = _[0]
    , err = _[1];

  if (fd) {
    tm.fs_close(fd);
  }
  return !err && fd != undefined;
}

function Stats () {
}

Stats.prototype.isFile = function () { return this._isFile; }
Stats.prototype.isDirectory = function () { return this._isDirectory; }
Stats.prototype.isBlockDevice = function () { return this._isBlockDevice; }
Stats.prototype.isCharacterDevice = function () { return this._isCharacterDevice; }
Stats.prototype.isSymbolicLink = function () { return this._isSymbolicLink; }
Stats.prototype.isFIFO = function () { return this._isFIFO; }
Stats.prototype.isSocket = function () { return this._isSocket; }

function statSync (pathname) {
  var stats = new Stats;

  stats._isFile = _isFile(pathname);
  stats._isDirectory = _isDirectory(pathname);
  stats._isBlockDevice = 0;
  stats._isCharacterDevice = 0;
  stats._isSymbolicLink = 0;
  stats._isFIFO = 0;
  stats._isSocket = 0;

  // unix fakery
  stats.dev = 0;
  stats.ino = 0;
  stats.mode = 0;
  stats.nlink = 0;
  stats.uid = 0;
  stats.gid = 0;
  stats.rdev = 0;
  stats.size = 0; //tm.fs_length();
  stats.blksize = 0;
  stats.blocks = 0;
  stats.atime = new Date();
  stats.mtime = new Date();
  stats.ctime = new Date();
}


exports.readFile = readFile;
exports.readFileSync = readFileSync;
exports.readdir = readdir;
exports.readdirSync = readdirSync;
exports.writeFileSync = writeFileSync;
exports.appendFileSync = appendFileSync;
exports.renameSync = renameSync;
exports.truncateSync = truncateSync;
exports.unlinkSync = unlinkSync;
exports.mkdirSync = mkdirSync;
exports.rmdirSync = rmdirSync;
exports.existsSync = existsSync;
