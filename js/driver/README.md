# Driver runtime modules

`index.html` intentionally keeps classic script tags in this order for compatibility with the existing global API. Each file was extracted from one inline block without changing its body.

## Load order

The numbered files are loaded in ascending order from `index.html`. The order is part of the current legacy contract because later blocks patch or extend functions created by earlier blocks. Do not reorder or delete a block until the corresponding feature has been consolidated and its contract tests have been updated.

## Next consolidation targets

The following pairs still contain overlapping runtime responsibilities and should be unified in a later change: the inline cockpit and `js/modules/cockpit.js`, the inline GPS blocks and `js/location-core.js`/`js/modules/gps-boost.js`, the two wallet implementations, and the two AI assistant implementations. This extraction makes those boundaries explicit without silently changing business behavior.
