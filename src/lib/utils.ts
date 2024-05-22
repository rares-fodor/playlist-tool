export function decodeHTML(html: string | undefined) {
    if (html === undefined) {
        return;
    }
    var txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}
