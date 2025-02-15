import { computed, defineEmit, nextTick, Ref, ref, unref, watch } from "vue";
import { TagModel } from "../models";
import HandlePaste from "./HandlePaste";

interface PropModel {
  autosuggest: boolean;
  allowPaste: {
    delimiter: string;
  };
  allowDuplicates: boolean;
  maxTags: number;
  width: string;
  defaultTags?: string[];
  sources: string[];
  quickDelete?: boolean;
}

export default function ({ autosuggest, allowPaste, allowDuplicates, maxTags, defaultTags = [], sources, quickDelete, width }: PropModel, ctx:any) {
    
  const delTagRef = ref<{ id: string } | null>(null);
  // ref to store the tags data. init with default tags
  const tagsData = ref<TagModel[]>(defaultTags.slice(0, maxTags).map(name => ({
    id: Math.random().toString(16).slice(2),
    name,
    value: name
  })));
  const textInputRef = ref(null);
  // ref for the input box
  const input = ref("");

  let arrayData = ref<string[]>(tagsData.value.map(a => a.name));

  // ref to track the tags created by te user
  const tagsCreated = ref(defaultTags.length ? Math.min(defaultTags.length, maxTags) : 0);
  // ref to display the suggestion pane
  const showSuggestions = ref(false);
  // ref to track ctrl+a selection
  const selectAllRef = ref(false);
  const selectedIndex = ref(-1);

  const style = computed(() => ({
    width,
  }));

  const filteredItems = computed(() => {
    const reg = new RegExp("^" + input.value, "i");
    return sources.filter((f) => reg.test(f));
  });

  const focus = () => {
    (textInputRef.value as unknown as HTMLElement).focus()
  };

  const reset = () => {
    // remove highlight from all tags
    tagsData.value = tagsData.value.map(t => {
      delete t.highlight;
      return t;
    });
    // disable autosuggest
    showSuggestions.value = false;
    selectAllRef.value = false;
    selectedIndex.value = -1;
  };

  watch(input, (newValue) => {

    if (delTagRef.value) {
      delTagRef.value = null;
      tagsData.value = tagsData.value.map((t) => {
        delete t.highlight;
        return t;
      });
    }

    if (newValue) {
      selectAllRef.value = false;

      if (autosuggest && newValue.length > 0) {
        showSuggestions.value = true;
      } else if (autosuggest && newValue.length < 1) {
        showSuggestions.value = false;
      }
    } else {
      showSuggestions.value = false;
    }
  });

  watch(selectAllRef, newValue => {
    tagsData.value = tagsData.value.map(tag => Object.assign({}, tag, {
      highlight: newValue
    }));
  });

  // checks if a new tag can be added
  const canAddTag = (name: string) => {
    const tester = new RegExp(`^${name}$`, "ig");
    const duplicatesCheck = !allowDuplicates
      ? !tagsData.value.some((tag) => tag.name === name || tester.test(tag.name))
      : allowDuplicates;
    const maxAllowed = tagsCreated.value < maxTags;
    return duplicatesCheck && maxAllowed;
  };

  // handler to add a new tag
  const handleAddTag = (name: string) => {
    let nameToUse = '';
    const selIndex = unref(selectedIndex);

    if (selIndex > -1) {
      nameToUse = filteredItems.value[selIndex];
    } else {
      nameToUse = name;
    }

    if (!canAddTag(nameToUse)) {
      return; 
    }

    let newTag = null;

    if (showSuggestions.value && selectedIndex.value > -1) {
      newTag = filteredItems.value[selectedIndex.value]
    } else {
      newTag = nameToUse;
    }

    if (newTag) {
      tagsData.value = tagsData.value.concat({
        name: newTag,
        id: Math.random().toString(16).slice(2),
        value: newTag,
      });
    }

    updateValue();

    input.value = "";
    showSuggestions.value = false;
    tagsCreated.value += 1;
    selectedIndex.value = -1;

    nextTick(() => focus());
  };

  // handler to remove a tag
  const handleRemoveTag = (id: string) => {
    tagsData.value = tagsData.value.filter((t) => t.id !== id);
    tagsCreated.value -= 1;
    updateValue();
  };

  const handleDelete = () => {
    if (input.value) {
      return;
    }

    if (selectAllRef.value) {
      tagsData.value = [];
      selectAllRef.value = false;
      tagsCreated.value = 0;
      return;
    }

    if (delTagRef.value) {
      const tag = delTagRef.value;
      tagsData.value = tagsData.value.filter((t) => t.id !== tag.id);
      delTagRef.value = null;
      tagsCreated.value -= 1;
    } else if (tagsData.value.length) {
      const tag = tagsData.value[tagsData.value.length - 1];
      delTagRef.value = {
        id: tag.id,
      };
      tagsData.value = tagsData.value.map((t) => {
        if (t.id === tag.id) {
          return Object.assign({}, t, {
            highlight: true,
          });
        } else {
          return t;
        }
      });
    }
  };

  // handle to manage paste
  const handlePaste = (event: ClipboardEvent) => {
    // cancel the default operation
    event.stopPropagation();
    event.preventDefault();

    // get the clipboard data
    const data = event.clipboardData && event.clipboardData.getData("text");

    if (data) {
      const pasteResult = HandlePaste(unref(tagsData), data, maxTags, unref(tagsCreated), allowPaste.delimiter, allowDuplicates);

      if (pasteResult && pasteResult.newData) {
        tagsData.value = pasteResult.newData;
        tagsCreated.value = pasteResult.tagsCreated;
      }
    }

  };

  const handleEscape = () => reset();

  const handleEditTag = (id: string, newValue: string) => {
    tagsData.value = tagsData.value.map((tag) => {
      if (tag.id === id) {
        return Object.assign({}, tag, {
          name: newValue,
          value: newValue,
        });
      } else {
        return tag;
      }
    });
  };

  const handleSuggestSelection = (name: string) => {
    showSuggestions.value = false;
    nextTick(() => {
      handleAddTag(name);
    });
  };

  const handleKeydown = (event: KeyboardEvent) => {
    event.preventDefault();

    const curSelIndex = unref(selectedIndex);

    if (curSelIndex < unref(filteredItems).length - 1) {
      selectedIndex.value = selectedIndex.value + 1;
    } else {
      selectedIndex.value = 0;
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    event.preventDefault();

    const curSelIndex = unref(selectedIndex);

    if (curSelIndex > 0) {
      selectedIndex.value = selectedIndex.value - 1;
    } else {
      selectedIndex.value = unref(filteredItems).length - 1;
    }
  };

  const handleSuggestEsc = () => {
    focus();
    showSuggestions.value = false;
  }

  const handleSelectAll = (event: KeyboardEvent) => {
    if (!quickDelete) {
      return;
    }
    if (event.keyCode === 65 && !input.value) {
      selectAllRef.value = true;
      delTagRef.value = null;
    }
  };

  const updateValue = () => {
    arrayData = ref<string[]>(tagsData.value.map(a => a.name));
    ctx.emit("update:modelValue", arrayData.value);
  }

  return {
    tagsData,
    arrayData,
    input,
    style,
    textInputRef,
    showSuggestions,
    selectedIndex,
    filteredItems,
    handleKeyUp,
    handleKeydown,
    handleAddTag,
    handleRemoveTag,
    handleDelete,
    handleEscape,
    handlePaste,
    handleEditTag,
    handleSuggestSelection,
    handleSuggestEsc,
    handleSelectAll,
    updateValue
  };
}
