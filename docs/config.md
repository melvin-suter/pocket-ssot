# Config

Edit/Create the file `/etc/pocket-ssot/pocket-ssot.yml` and set what you want to change. Following the possibilities and their default values:

```yaml
host: 0.0.0.0 # bind for the main api & ui
port: 5000 # Port for the main api & ui
storePath: /var/lib/pocket-ssot # where data lifes
extension: .yml # if .yaml or .yml should be used
localhostPort: 5001 # port for localhost wihtou auth, used for cli tool
```