# gistachio

Lightweight Gist JS functions for browsers.

I made this because all the JS libraries I could find for working with Gists
out there either have heavyweight dependencies like jQuery, or are written for
Node.JS / browserify. I prefer my libraries to be lightweight and
self-contained wherever possible.

## Demo / examples

See gistachio in action at https://stuartpb.github.io/gistachio/demo.html

## Requirements

This script uses `addEventListener` on XMLHttpRequest to handle its loading and
potential error scenarios, so you'll need a browser that supports the progress
events for XHR. This has been supported in the evergreen browsers (Firefox and
Chrome) for several years - as usual, the only place you'll encounter problems
will be with Internet Explorer, which didn't implement XHR events until IE10
(if [MDN's support matrix][MDNXHR] is to be believed).

To use this in earlier versions of IE (or some similarly ancient version of any
other browser), you'll need to implement a
[polyfill for these events on XMLHttpRequest][polyfill]. This seems like a
sensible thing to want, making it altogether more surprising that none seems to
exist at time of writing (January 6 2015).

[MDNXHR]: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest#compat-desktop
[polyfill]: https://github.com/inexorabletash/polyfill/issues/49

## Usage

Use this file by including it as a `<script>`. It will add `window.gistachio`.

### Callback error handling

gistachio's callback signatures use the traditional Node.JS convention of
taking an `err` argument first, which will be `null` if the operation succeeds
with no errors, or some truthy value if there is an error.

The potential values for `err` are:

- A parsed JSON error from the GitHub API, eg. if your request doesn't match
  the expected format. gistachio does only a little coercion (for postFiles)
  and does no validation of its own, so this is the most likely error you're
  going to encounter.
- A JSON parse error if the request succeeds (at the network level), but
  something goes wrong interpreting the response from the API as JSON. The
  original body that failed to parse will probably be in some property on that
  error, although I'm not sure what. I think this is one of those non-standard
  things that varies from browser to browser.
- A ProgressEvent passed to the event handler for one of XMLHttpRequest's
  non-successful load events: `error`, `abort`, or `timeout`. I couldn't find
  any documentation signifying how errors are signaled: again, the salient data
  will likely be somewhere beentween a spec-compliant standard property and a
  non-standard and browser-dependent feature of the error.

### Common options

These options are supported on all methods:

- `accessToken`: an [OAuth 2 access token][oauth] to authenticate requests to
  the GitHub API. You need this to post user-owned, non-anonymous gists, or to
  make changes to a user's already-posted gists. The accessToken can also be
  used for many other GitHub API tasks that aren't covered by gistachio.
- `username` and `password`: The less-savory alternative to using `accessToken`
  to authenticate requests as a user. You really shouldn't use this kind of
  authentication. Even if it's just your own account, you should generate a
  personal access token at https://github.com/settings/applications instead of
  passing your password around through anything other than a GitHub login page.

[oauth]: https://developer.github.com/v3/oauth/

### gistachio.getFiles(gistId, [opts,] callback)

Gets the files for the gist with the given ID.

The callback signature is `(err, files)`, where `files` is an object with the
filenames of the gist as the keys, and the contents of each file as string
values.

Behind the scenes, this will entail multiple requests if any of the Gist's
files are over the [truncation limit][truncation] (one megabyte) for the Gist
API. If any files are over *ten* megabytes (the limit of the raw content CDN),
they are beyond the reach of ordinary API requests, and you will need a
heavyweight solution, involving full-on Git checkouts, to retrieve them (see
the previous link).

[truncation]: https://developer.github.com/v3/gists/#truncation

### gistachio.postFiles(files, [opts,] callback)

Create a new gist with the given files.

The `files` object can mirror the structure of the `getFiles` response, where
each value is the string content of the filenamed by the key. The values can
also be objects, with the file's content as the string value of the `content`
property. This is the format expected by the API (the former will be converted
to the latter by gistachio), and this leaves room for the structure of the
`files` argument used for editing Gists, where the object can also have a
`filename` property to rename the file (see the documentation for patchFiles
below).

If authentication for a user (as described above, either via token or
username+password) is provided, the created gist will be owned by the
authenticated user. Otherwise it will be posted anonymously, with no owner, and
no way to edit the gist after posting (other than to create a fork).

In addition to the authentication options, a `description` option can be
provided as part of `opts`, specifying a default description for the gist. A
`public` option can also be specified, with a value of `true` posting the gist
as a public, discoverable, and (if authentication is provided and the gist is
created with an owner) listed on the owner's Gist profile.

The callback signature is `(err, gistId)`, where `gistId` is the ID of the
newly-created gist (accessible by going to `https://gist.github.com/` + the ID,
which will redirect you to the username (or `anonymous`) prefixed URL for the
gist.

### gistachio.patchFiles(gistId, files, [opts,] callback)

Edit an existing gist.

The `files` argument is an object describing the *changes* that will be made
to any files in the gist. Any files not present in the `files` object will be
*unchanged* from their existing contents. As with postFiles, the values of the
`files` object's filename keys may be either string contents (containing the
new content for the named file), or an object with a `content` property
containing the file's new content, and/or a `filename` property containing the
file's new name. (To delete a file, use `{filename: null}` as the file's
value.) [See the API documentation.][edit-a-gist] Any keys in `files` that
don't match an existing file's name will create a new file in the gist.

[edit-a-gist]: https://developer.github.com/v3/gists/#edit-a-gist

patchFiles can take a `description` option to edit the gist's description,
providing the new description as the value. (Due to
[an oversight in the API][isaacs/github#329], it is *not* currently possible
to change the gist's publication status via the `public` option, the way it is
when initially creating the gist.)

[isaacs/github#329]: https://github.com/isaacs/github/issues/329

As anonymous gists do not allow editing, this will need authentication in the
form of `accessToken` or `username` and `password` options, for the user who
owns the gist. (Failure to do so will result in an error from the GitHub API,
obviously.)

The callback signature for patchFiles is the same as getFiles, returning the
gist's new contents after the modification is applied. The same caveats around
truncation limits and multiple requests apply.

## FAQ

### I want to work with more than just file contents and gist IDs!

If you want access to everything provided by the GitHub API, use a proper
GitHub API JS module. This module is just for handling files (and posting the
descriptions / public status because there's plenty of room for it in the
design).

## [License in Three Lines ![(LITL)](https://litl-license.org/logo.svg)][LITL]

[LITL]: https://litl-license.org

Copyright 2015 Stuart P. Bentley.<br>
This work may be used freely as long as this notice is included.<br>
The work is provided "as is" without warranty, express or implied.
