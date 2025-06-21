# 🛠️ API Workshop (Schema Editor)

The API Workshop Schema Editor is a powerful tool designed to help you quickly and efficiently create, edit, and share API schemas. The app is currently in **early preview** and is evolving rapidly toward becoming a fully-fledged API design platform.

## ✨ Features

1. **Create, manage, and edit JSON schemas** in an intuitive and keyboard-friendly interface.

Most JSON Schema data types are supported, though as the long-term goal is for the app to transition into an API design tool, full compatibility with all JSON Schema features is not a priority. Incompatibilities with JSON Schema features will be dealt with on a case-by-case basis as the app evolves.

2. **Compose and reuse schemas and enums** with ease.

All schemas and enums can be referenced inline for clean, well structured model design. On export, all references will be resolved and the resulting schema will be a complete, valid JSON Schema.

3. **Import existing JSON schemas and export your work** to share with others.

Importing and exporting from the Schema Editor is as simple as a click of a button. If any unsupported JSON Schema features are detected, the imported schema will attempt to keep those properties intact and let you know. Please note that at this stage the import feature only supports importing a single, unbundled schema that uses direct pointer references. References that rely on `$id` or `$anchor` will not be resolved.

4. **All work is saved in a browser-local database** and stays private to your machine.

While a server-sync function may be added in the future, local-first working ensures the data is always available and secure. You can use export and import features to share your work with others when necessary.

## 🗺️ Roadmap

### Schema Editor

- [ ] Add support for descriptions and metadata features of JSON schema
- [ ] Add support for validation features of JSON schema (such as min, max, etc.)
- [ ] Add support for dictionaries/objects without a strict type
- [ ] More gracefully handle simple union types on import (though full support is not planned)
- [ ] Support importing and exporting of bundled schemas (and potentially ZIPs?)

### API Designer

- [ ] Add a new 'Endpoint' entity to the app for API endpoints
- [ ] Support linking endpoints to schemas for request and response bodies
- [ ] Support importing and exporting to OpenAPI
- [ ] More to come...

## 🤝 Contributing

Contributions are welcome! Whether you want to report a bug, suggest a feature, or submit a pull request, your input is valuable to making the API Workshop better.

## 📝 License

This project is open source and available under the GPL3 License.
