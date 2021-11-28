import Mdict from 'js-mdict';
import path from 'path';
import fs from 'fs';

import { SuggestItem } from '../model/SuggestItem';
import { Definition, NullDef } from '../model/Definition';
import { StorabeDictionary } from '../model/StorableDictionary';
import { logger } from '../utils/logger';
import FuzzyTrie from './indexing/FuzzyTrie';
import { SyncMainAPI } from '../worker/worksvc/worker.main.svc.manifest';


function __closureResourceRoot() {
  let _resourceRoot = '';
  return function() {
    if(_resourceRoot === '') {
      _resourceRoot = SyncMainAPI.syncGetResourceRootPath();
    }
    return _resourceRoot
  }
}


function __closureResourceServerPort() {
  let _resourcePort = 0;
  return function() {
    if(_resourcePort === 0) {
      _resourcePort = SyncMainAPI.syncGetResourceServerPort();
    }
    return _resourcePort
  }
}
const fnResourceRoot = __closureResourceRoot();
const fnResourceServerPort = __closureResourceServerPort();

function isArray(o: any) {
  return Object.prototype.toString.call(o) == '[object Array]';
}

/**
 * Dictionary 词典实体类
 * id: 词典唯一ID, 通常是随机生成的UUID
 * alias: 别名，用于展示在下拉框中，不超过6字符
 * name: 词典全名
 * mdxpath: mdx 文件完整路径
 * mddpath: mdd 文件完整路径
 * resourceBaseDir: 资源文件基础路径
 * mdxDict: mdx 词典实例
 * mddDict: mdd 词典实例
 */
export class Dictionary extends StorabeDictionary {
  mdxDict: Mdict;
  mddDicts: Mdict[];
  description: string;
  mdxIndex: FuzzyTrie = new FuzzyTrie();
  mddIndex: FuzzyTrie[] = [];
  indexed: boolean = false;

  public static newByStorabe(dict: StorabeDictionary) {
    return new Dictionary(dict.id, dict.alias, dict.name, dict.mdxpath, dict.mddpath, dict.description);
  }


  constructor(
    id: string,
    alias: string,
    name: string,
    mdxpath: string,
    mddpath?: string | string[],
    description?: string
  ) {
    super(id, alias, name, mdxpath, mddpath);
    this.mdxDict = new Mdict(mdxpath);
    this.mddDicts = [];
    if (
      mddpath &&
      typeof mddpath === 'string' &&
      mddpath != '' &&
      mddpath.length > 0
    ) {
      this.mddDicts.push(new Mdict(mddpath));
    }
    if (mddpath && isArray(mddpath) && mddpath.length > 0) {
      for (let i = 0; i < mddpath.length; i++) {
        this.mddDicts.push(new Mdict(mddpath[i]));
      }
    }
    this.description = description || 'undefined';
  }

  indexing() {
    if (!this.mdxDict) {
      return;
    }
    const keyWords = this.mdxDict.rangeKeyWords();
    for (let word of keyWords) {
      this.mdxIndex.add(word.keyText, word);
    }

    this.mddDicts.forEach(mdd => {
      const mddTrie = new FuzzyTrie();
      const mddKey = mdd.rangeKeyWords();
      for (let key of mddKey) {
        mddTrie.add(key.keyText, key);
      }
      this.mddIndex.push(mddTrie)
    });
    // 将词典标记为已经索引完成
    this.indexed = true;
  }

  lookup2(word: string) {
    const wordIndex = this.mdxIndex.has(word);
    if (!wordIndex || wordIndex == null || !wordIndex.getData()) {
      return NullDef(word);
    }

    const result = this.mdxDict.parse_defination(wordIndex.getData().keyText, wordIndex.getData().roffset);
    if (!result) {
      return NullDef(word);
    }
    return (result as unknown) as Definition;

  }

  associate2(word: string) {
    const result: SuggestItem[] = [];
    if (word.trim() == '' || word.length === 0) {
      return result;
    }
    // limits word result upto 50
    let counter = 0;
    const limit = 50;
    const pfxWords = this.mdxIndex.prefix(word);
    if (!pfxWords || pfxWords.length == 0) {
      return [];
    }
    for (let i = 0; i < pfxWords?.length ?? 0; i++) {
      if (counter >= limit) {
        break;
      }
      const word = pfxWords[i];
      result.push({ id: counter, dictid: this.id, ...word.data });
      counter++;
    }
    return result;
  }


  findWordDefinition(keyText: string, roffset: number) {
    const result = this.mdxDict.parse_defination(keyText, roffset);
    if (!result) {
      return NullDef(keyText);
    }
    return (result as unknown) as Definition;
  }

  findWordResource(keyText: string, withPayload = false, skipFileCache = false) {
    let result = NullDef(keyText);
    // load cache first
    const fileCachePath = rscCachePath(this.id, keyText);
    if (!skipFileCache && fs.existsSync(fileCachePath)) {
      const contentBuffer = fs.readFileSync(fileCachePath);
      logger.info(
        `[WORKER] read cache file: ${fileCachePath} ${contentBuffer?.length ?? 0
        }`
      );
      if (withPayload) {
        return {
          keyText,
          definition: rscRelativePath(this.id, keyText),
          contentSize: contentBuffer?.length ?? 0,
          payload: contentBuffer.toString('base64'),
        } as Definition;
      }
      return {
        keyText,
        definition: rscRelativePath(this.id, keyText),
        contentSize: contentBuffer?.length ?? 0,
      } as Definition;
    }

    for (let i = 0; i < this.mddDicts.length; i++) {
      const tempMdd = this.mddDicts[i];
      if (!tempMdd) {
        continue;
      }
      let tempResult = tempMdd.lookup(keyText);
      if (tempResult && tempResult.definition) {
        result = {
          keyText: tempResult.keyText,
          definition: tempResult.definition,
          contentSize: tempResult.definition.length,
        };
      }
    }
    if (result && result.definition) {
      const filePath = rscCachePath(this.id, keyText);
      fs.writeFileSync(filePath, Buffer.from(result.definition, 'base64'));
      logger.info(`[WORKER] replace resource PATH write cache file: ${filePath}`);

      if (withPayload) {
        return {
          keyText,
          definition: rscRelativePath(this.id, keyText),
          contentSize: result.definition ? result.definition.length : 0,
          payload: result.definition,
        } as Definition;
      } else {
        return {
          keyText,
          definition: rscRelativePath(this.id, keyText),
          contentSize: result.definition ? result.definition.length : 0,
        } as Definition;
      }
    }

    return {
      keyText,
      definition: rscRelativePath(this.id, keyText),
      contentSize: 0,
    } as Definition;
  }

  lookup(word: string) {
    return this.mdxDict.lookup(word);
  }

  associate(word: string) {
    const result: SuggestItem[] = [];
    if (word.trim() == '' || word.length === 0) {
      return result;
    }
    // limits word result upto 50
    let counter = 0;
    const limit = 50;
    const words = this.mdxDict.associate(word);
    for (let i = 0; i < words?.length ?? 0; i++) {
      if (counter >= limit) {
        break;
      }
      const word = words[i];
      // logger.info(`set ${key}, ${word.keyText}`)
      result.push({ id: counter, dictid: this.id, ...word });
      counter++;
    }
    return result;
  }
}

function rscCachePath(dictid: string, resourceKey: string) {
  if (!dictid || dictid === '') {
    throw new Error(`invalid dictionary id ${dictid}`);
  }
  const resourcePath = resourceKey.split('\\');

  const fullPath = path.join(fnResourceRoot(), dictid, ...resourcePath);
  const fullDirPath = path.dirname(fullPath);
  if (!fs.existsSync(fullDirPath)) {
    fs.mkdirSync(fullDirPath, { recursive: true });
  }
  return fullPath;
}

function rscRelativePath(dictid: string, resourceKey: string) {
  if (!dictid || dictid === '') {
    throw new Error(`invalid dictionary id ${dictid}`);
  }
  const resourceServerPort = fnResourceServerPort();
  const resourcePath = resourceKey.split('\\');
  const fullPath = path.join(dictid, ...resourcePath);
  return 'http://localhost:' + resourceServerPort + '/' + fullPath;
}
