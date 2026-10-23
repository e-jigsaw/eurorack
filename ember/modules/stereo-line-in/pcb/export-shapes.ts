import {shapes} from './footprints';
import {physicalParts} from './parts';
import {writeFileSync} from 'node:fs';
writeFileSync(new URL('./physical-input.json',import.meta.url),JSON.stringify({shapes,parts:physicalParts},null,2));
