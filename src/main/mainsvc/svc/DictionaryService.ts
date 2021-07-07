import { Dictionary } from '../../domain/Dictionary';
import { SuggestItem } from '../../../model/SuggestItem';
import { NullDef } from '../../../model/Definition';
import { StorabeDictionary } from '../../../model/StorableDictionary';

const dicts = new Map<string, Dictionary>();
dicts.set(
  'oale8',
  new Dictionary(
    'oale8',
    'oale8',
    'Oxford Advanced Leaner English 8',
    '/Users/chenquan/Workspace/nodejs/js-mdict/mdx/testdict/oale8.mdx',
    '/Users/chenquan/Workspace/nodejs/js-mdict/mdx/testdict/oale8.mdd',
    'oale8默认描述'
  )
);

export class DictService {
  findOne(dictid: string) {
    return dicts.get(dictid);
  }

  findAll() {
    const list: StorabeDictionary[] = [];
    dicts.forEach(val => {
      list.push(val);
    });
    return list;
  }

  addOne(dict: Dictionary) {
    if (dicts.has(dict.id)) {
      return false;
    }
    dicts.set(dict.id, dict);
    return true;
  }

  deleteOne(dictid: string) {
    return dicts.delete(dictid);
  }

  findWordPrecisly(dictid: string, keyText: string, rofset: number) {
    return dicts.get(dictid)?.findWordDefinition(keyText, rofset);
  }

  loadDictResource(dictid: string, keyText: string) {
    return dicts.get(dictid)?.findWordResource(keyText) ?? NullDef(keyText);
  }
  lookup(dictid: string, keyText: string) {
    return dicts.get(dictid)?.lookup(keyText) ?? NullDef(keyText);
  }
  associate(word: string) {
    const result: SuggestItem[] = [];
    if (word.trim() == '' || word.length === 0) {
      return result;
    }

    const tempMap = new Map<string, SuggestItem>();
    // limits word result upto 50
    let counter = 0;
    const limit = 50;
    for (const key of dicts.keys()) {
      const words = dicts.get(key)?.associate(word);
      if (!words) {
        continue;
      }
      for (let i = 0; i < words?.length ?? 0; i++) {
        if (counter >= limit) {
          break;
        }
        const word = words[i];
        // console.log(`set ${key}, ${word.keyText}`)
        tempMap.set(word.keyText, {
          id: counter,
          dictid: word.dictid,
          keyText: word.keyText,
          rofset: word.rofset,
        });
        counter++;
      }
    }
    // reassembe
    for (const item of tempMap.values()) {
      result.push(item);
    }
    return result;
  }
}
