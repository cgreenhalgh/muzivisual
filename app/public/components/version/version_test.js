'use strict';

describe('MuziVisual.version module', function() {
  beforeEach(module('MuziVisual.version'));

  describe('version service', function() {
    it('should return current version', inject(function(version) {
      expect(version).toEqual('0.1');
    }));
  });
});
