.PHONY: updateStore

updateStore:
	$(RM) -rf common_html || true
	mkdir common_html
	cp -r *.js *.html *.css common_html
	mkdir common_html/images
	cp -r images/*.png common_html/images
	butler push common_html whynotgames/common-ground:html
