package tree_sitter_rgbasm_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_rgbasm "github.com/issotm/tree-sitter-rgbds/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_rgbasm.Language())
	if language == nil {
		t.Errorf("Error loading RGBASM grammar")
	}
}
