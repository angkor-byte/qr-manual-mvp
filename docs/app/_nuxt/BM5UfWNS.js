import n from"./CEfZkaeN.js";import{Z as r,ag as o,o as s,c as l,ai as i,b as d,aj as a}from"./CkiZLiyz.js";var p=`
    .p-overlaybadge {
        position: relative;
    }

    .p-overlaybadge .p-badge {
        position: absolute;
        inset-block-start: 0;
        inset-inline-end: 0;
        transform: translate(50%, -50%);
        transform-origin: 100% 0;
        margin: 0;
        outline-width: dt('overlaybadge.outline.width');
        outline-style: solid;
        outline-color: dt('overlaybadge.outline.color');
    }

    .p-overlaybadge .p-badge:dir(rtl) {
        transform: translate(-50%, -50%);
    }
`,v={root:"p-overlaybadge"},g=r.extend({name:"overlaybadge",style:p,classes:v}),c={name:"OverlayBadge",extends:n,style:g,provide:function(){return{$pcOverlayBadge:this,$parentInstance:this}}},m={name:"OverlayBadge",extends:c,inheritAttrs:!1,components:{Badge:n}};function y(e,u,b,B,f,$){var t=o("Badge");return s(),l("div",a({class:e.cx("root")},e.ptmi("root")),[i(e.$slots,"default"),d(t,a(e.$props,{pt:e.ptm("pcBadge")}),null,16,["pt"])],16)}m.render=y;export{m as default};
