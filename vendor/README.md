# Temporary CDK dependency patch

`aws-cdk-lib-2.272.0-brace-patched.tgz` is the published `aws-cdk-lib@2.272.0`
archive with its bundled `brace-expansion@5.0.9` replaced by
`brace-expansion@5.0.12`. CDK bundles that dependency, so npm overrides cannot
replace it. This keeps the deployment workflow's full high-severity audit gate
enabled while the published CDK archive is awaiting an updated bundle.

The input archive SHA-256 values are:

- `aws-cdk-lib@2.272.0`: `bbb06fb8e6f1853fce825c03bfdf291082d4753c65b1f0e002677631100fef75`
- `brace-expansion@5.0.12`: `ef8448ec78f20b692f04fa6d01f39b5ab34c66404bea3429f5a39c6c9e0be8b4`

The vendored output SHA-256 is
`e7d03ced2610a20a47a3fe935e7358a2ef6b6bc2d6ca955df1f0fb6982049133`.
A file-by-file comparison of the original and patched archives found 7,561 files
in each and only nine changed files, all under
`package/node_modules/brace-expansion/`. Replace this temporary archive with a
normal npm release once CDK bundles a patched version.
