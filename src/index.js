/*
 * @file: main entry
 * @author: GaoYYYang
 * @date: 06 30 2020 4:51:22
 */

import { getOptions, interpolateName, parseQuery } from 'loader-utils';
import validateOptions from 'schema-utils';

import compress from './lib/compress';
import inline from './lib/inline';
import emit from './lib/emit';
import {
  DEFAULT_INLINE_OPTION,
  LOSSY_HIGH_COMPRESS_OPTION,
  LOSSY_LOW_COMPRESS_OPTION,
  LOSELESS_COMPRESS_OPTION,
  DEFAULT_ES_MODULE,
  DEFAULT_NAME
} from './constants';
import schema from './options.json';

function checkNeedInline(option, size) {
  if (option.disable) {
    return false;
  }

  const { resourceQuery } = this;
  const { limit, symbol, antiSymbol } = option;
  const query = (resourceQuery && parseQuery(resourceQuery)) || {};

  if (query[symbol]) {
    return true;
  }

  if (query[antiSymbol]) {
    return false;
  }

  if (typeof limit === 'boolean') {
    return limit;
  }

  if (typeof limit === 'string') {
    return size <= parseInt(limit, 10);
  }

  if (typeof limit === 'number') {
    return size <= limit;
  }

  return true;
}

function inlineOrEmit(options, data) {
  if (checkNeedInline.call(this, options, data.length)) {
    inline.call(this, data, options);
  } else {
    emit.call(this, data, options);
  }
}

export default function loader(source) {
  const options = getOptions(this) || {};
  const { mode, resourcePath, resourceQuery } = this;
  const esModule = options.esModule || DEFAULT_ES_MODULE;
  const name = options.name || DEFAULT_NAME;
  validateOptions(schema, options, 'image-optimize-loader');

  let compressOption = LOSSY_LOW_COMPRESS_OPTION;
  if (options.compress) {
    if (options.compress.mode === 'high') {
      compressOption = Object.assign(LOSSY_HIGH_COMPRESS_OPTION, options.compress);
    } else if (options.compress.mode === 'loseless') {
      compressOption = Object.assign(LOSELESS_COMPRESS_OPTION, options.compress);
    } else {
      compressOption = Object.assign(compressOption, options.compress);
    }
  }

  let inlineOption = DEFAULT_INLINE_OPTION;
  if (options.inline) {
    inlineOption = Object.assign(inlineOption, options.inline);
  }

  if (mode === 'production' || compressOption.disableOnDevelopment === false || !compressOption.disable) {
    const callback = this.async();
    compress(source, compressOption)
      .then(data => {
        inlineOrEmit.call(this, { ...inlineOption, esModule, name }, data);
      })
      .catch(err => {
        callback(err);
      });
  } else {
    inlineOrEmit.call(this, { ...inlineOption, esModule, name }, source);
  }
}

module.exports.raw = true;
