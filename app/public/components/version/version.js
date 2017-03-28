'use strict';

angular.module('MuziVisual.version', [
  'MuziVisual.version.interpolate-filter',
  'MuziVisual.version.version-directive'
])

.value('version', '0.1');
