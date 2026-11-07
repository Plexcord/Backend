#=========================================================================#
# Plexcord Cloud API - HestiaCP nginx proxy template (HTTP)               #
# Forwards everything to the Next.js app on 127.0.0.1:9876.               #
# Install: copy plexcord-api.tpl + plexcord-api.stpl to                   #
#   /usr/local/hestia/data/templates/web/nginx/                           #
# then pick "plexcord-api" as the Proxy Template for the domain.          #
#=========================================================================#

server {
	listen      %ip%:%proxy_port%;
	server_name %domain_idn% %alias_idn%;
	error_log   /var/log/%web_system%/domains/%domain%.error.log error;

	include %home%/%user%/conf/web/%domain%/nginx.forcessl.conf*;

	location ~ /\.(?!well-known\/) {
		deny all;
		return 404;
	}

	location / {
		proxy_pass http://127.0.0.1:9876;
		proxy_http_version 1.1;
		# Real client IP and scheme for logs.
		proxy_set_header Host $host;
		proxy_set_header X-Forwarded-Host $host;
		proxy_set_header X-Forwarded-Proto $scheme;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header Upgrade $http_upgrade;
		proxy_set_header Connection "upgrade";
		client_max_body_size 11m; # MAX_BODY_BYTES (10 MB) in src/lib/cloud.ts
	}

	location /error/ {
		alias %home%/%user%/web/%domain%/document_errors/;
	}

	include %home%/%user%/conf/web/%domain%/nginx.conf_*;
}
