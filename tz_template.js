(function() {
  "use strict";
  var BASE90 = " #$%&()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_abcdefghijklmnopqrstuvwxyz{|}~";
  function unpack(string) {
    var n = string.length >> 1,
        array = new Array(n);
    while(n--) {
      array[n] = BASE90.indexOf(string[n * 2 + 0]) * 90 + BASE90.indexOf(string[n * 2 + 1]);
    }
    return array;
  }

  var TZDATA = unpack(__TZDATA__),
      TZLIST = __TZLIST__;
  function tzlookup(lat, lon) {
    /* Make sure lat/lon are valid numbers. (It is unusual to check for the
     * negation of whether the values are in range, but this form works for
     * NaNs, too!) */
    lat = +lat;
    lon = +lon;
    if(!(lat >= -90.0 && lat <= +90.0 && lon >= -180.0 && lon <= +180.0)) {
      throw new RangeError("invalid coordinates");
    }

    /* The tree is essentially a quadtree, but with a very large root node.
     * The root node is 48x24; the width is the smallest such that maritime
     * time zones fall neatly on it's edges (which allows better compression),
     * while the height is chosen such that nodes further down the tree are all
     * square (which is necessary for the properties of a quadtree to hold). */
    /* Node offset in the tree. */
    var n = -1;

    /* Location relative to the current node. The root node covers the whole
     * earth (and the tree as a whole is in equirectangular coordinates), so
     * conversion from latitude and longitude is straightforward. The constants
     * are the smallest 64-bit floating-point numbers strictly greater than 360
     * and 180, respectively; we do this so that floor(x)<48 and floor(y)<24.
     * (It introduces a rounding error, but this is negligible.) */
    var x = (180.0 + lon) * 48 / 360.00000000000006,
        y = ( 90.0 - lat) * 24 / 180.00000000000003;

    /* Integer coordinates of child node. x|0 is simply a (signed) integer
     * cast, which is the fastest way to do floor(x) in JavaScript when you
     * can guarantee 0<=x<2^31 (which we can). */
    var u = x|0,
        v = y|0;

    /* Contents of the child node. The topmost values are reserved for leaf
     * nodes and correspond to the indices of TZLIST. Every other value is a
     * pointer to where the next node in the tree is. */
    var i = TZDATA[v * 48 + u];

    /* Recurse until we hit a leaf node. */
    while(i + TZLIST.length < 8100) {
      /* Increment the node pointer. */
      n = n + i + 1;

      /* Find where we are relative to the child node. */
      x = ((x - u) % 1.0) * 2;
      y = ((y - v) % 1.0) * 2;
      u = x|0;
      v = y|0;

      /* Read the child node. */
      i = TZDATA[48 * 24 + n * 4 + v * 2 + u];
    }

    /* Once we hit a leaf, return the relevant timezone. */
    return TZLIST[i + TZLIST.length - 8100];
  }

  if(typeof module !== "undefined") {
    module.exports = tzlookup;
  }
  else {
    window.tzlookup = tzlookup;
  }
})();
