(function () {
  "use strict";

  function freeze(value) {
    if (value && typeof value === "object") {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }

  // The original four drawings remain unchanged; the rig owns dynamic features and arms.
  const baseAvatars = [
    {
      id: "sana",
      name: "Sana",
      gender: "female",
      outfit: "hoodie",
      description: "Long center-part dark brown hair, a burgundy hoodie, pearl necklace and earrings.",
      palette: {
        skin: "#f2a582",
        hair: "#49382f",
        cloth: "#803447",
        shade: "#592936",
        trim: "#964457",
        outline: "#302a28",
        accent: "#f8ecd7",
        skinShadow: "#d58a69",
        lip: "#bb745f",
        iris: "#222425"
      },
      background: "white-grid",
      frontHair: `
        <g class="female-outline female-hair">
          <path d="M540 177 C498 148 441 148 390 173 C315 209 286 282 278 361 L265 473 C307 475 350 451 373 417 C396 382 406 325 434 290 C464 252 506 242 540 246 Z" />
          <path d="M540 177 C582 148 639 148 690 173 C765 209 794 282 802 361 L815 473 C773 475 730 451 707 417 C684 382 674 325 646 290 C616 252 574 242 540 246 Z" />
          <path d="M540 179 L540 234" fill="none" stroke-width="4" />
          <path d="M363 235 Q408 190 472 187 M608 187 Q672 190 717 235" fill="none" stroke="#655044" stroke-width="4" opacity="0.62" />
        </g>`,
      backHair: `
        <g class="female-outline female-hair">
          <path d="M540 177 C492 134 406 143 344 192 C290 237 273 321 264 393 C253 474 244 541 261 597 C272 632 257 668 274 704 C284 727 267 757 274 790 C282 829 308 818 321 849 C338 878 355 851 377 863 C410 880 439 837 463 811 L617 811 C641 837 670 880 703 863 C725 851 742 878 759 849 C772 818 798 829 806 790 C813 757 796 727 806 704 C823 668 808 632 819 597 C836 541 827 474 816 393 C807 321 790 237 736 192 C674 143 588 134 540 177 Z" />
          <path d="M313 440 C285 533 294 587 318 628 C337 662 309 707 328 749 C347 787 329 817 355 844 M767 440 C795 533 786 587 762 628 C743 662 771 707 752 749 C733 787 751 817 725 844" fill="none" stroke="#362922" stroke-width="8" />
        </g>`,
      body: `
        <g class="female-outline">
          <path class="female-hoodie" d="M410 694 C376 684 386 648 411 628 C440 603 476 606 494 614 L586 614 C604 606 640 603 669 628 C694 648 704 684 670 694 L642 733 L438 733 Z" />
          <path d="M416 683 Q450 639 494 639 L586 639 Q630 639 664 683 L642 719 L438 719 Z" fill="var(--cloth-shade)" />
          <path class="female-skin" d="M494 582 L586 582 L586 669 Q540 703 494 669 Z" />
          <path d="M494 595 Q540 626 586 595 L586 630 Q540 655 494 629 Z" fill="var(--skin-shadow)" stroke="none" />
          <path class="female-hoodie" d="M423 683 Q452 673 480 679 Q540 719 600 679 Q628 673 657 683 C676 695 691 718 702 750 L726 826 L750 1088 L330 1088 L354 826 L378 750 C389 718 404 695 423 683 Z" />
          <path d="M424 684 Q452 669 480 680 Q510 704 540 709 Q570 704 600 680 Q628 669 656 684 L636 711 Q594 739 540 739 Q486 739 444 711 Z" fill="var(--cloth-trim)" />
          <path class="female-fold" d="M424 685 Q451 723 475 743 M656 685 Q629 723 605 743 M382 786 Q401 861 386 936 M698 786 Q679 861 694 936" style="stroke: var(--cloth-shade);" />
          <path d="M481 727 C473 766 466 801 468 832 M599 727 C607 766 614 801 612 832" fill="none" stroke="var(--cloth-trim)" stroke-width="6" />
          <rect x="463" y="825" width="10" height="20" rx="4" fill="var(--outline-color)" stroke="none" />
          <rect x="607" y="825" width="10" height="20" rx="4" fill="var(--outline-color)" stroke="none" />
          <path d="M437 914 Q540 941 643 914 L666 1015 Q540 1040 414 1015 Z" fill="var(--cloth-shade)" stroke-width="3.5" />
          <path d="M450 925 L434 965 M630 925 L646 965" fill="none" stroke="var(--cloth-trim)" stroke-width="3" />
          <path class="female-fold" d="M335 1057 Q540 1079 745 1057" style="stroke: var(--cloth-shade);" />
          <path d="M495 645 Q540 674 585 645" fill="none" stroke-width="3.2" />
          <g fill="var(--cloth-trim)" stroke-width="2.8">
            <circle cx="500" cy="649" r="5.5" fill="#f8ecd7" />
            <circle cx="514" cy="656" r="5.5" fill="#f8ecd7" />
            <circle cx="531" cy="660" r="5.5" fill="#f8ecd7" />
            <circle cx="549" cy="660" r="5.5" fill="#f8ecd7" />
            <circle cx="566" cy="656" r="5.5" fill="#f8ecd7" />
            <circle cx="580" cy="649" r="5.5" fill="#f8ecd7" />
          </g>
        </g>`,
      facePath: "M540 245 C450 239 397 295 379 372 L368 466 C365 509 371 552 391 579 C409 603 436 616 478 621 L602 621 C644 616 671 603 689 579 C709 552 715 509 712 466 L701 372 C683 295 630 239 540 245 Z",
      nosePath: "M520 511 Q540 538 560 511",
      eyeScale: { x: 1, y: 1 },
      jewelry: true
    },
    {
      id: "ayan",
      name: "Ayan",
      gender: "male",
      outfit: "crewneck",
      description: "Short swept brown quiff, an angular tapered jaw and a teal crewneck with a geometric chest patch.",
      palette: {
        skin: "#e7a37b",
        hair: "#5c3c2b",
        cloth: "#247c74",
        shade: "#19574f",
        trim: "#439d89",
        outline: "#302a28",
        accent: "#e8c486",
        skinShadow: "#c28160",
        lip: "#a86650",
        iris: "#3b4636"
      },
      background: "cream-grid",
      frontHair: `
        <g class="female-outline female-hair">
          <path d="M371 433 L359 354 C347 310 358 280 375 256 L365 232 Q398 193 444 192 C445 167 470 146 509 150 Q544 150 568 177 C594 160 626 171 642 194 C687 189 728 227 730 278 Q739 321 719 372 L708 432 L694 408 L691 357 Q679 315 658 287 C629 304 596 294 563 283 Q524 299 487 286 Q459 292 435 280 C409 302 400 335 392 367 L384 427 Z" />
          <path d="M403 241 C438 208 479 198 520 217 C547 229 574 239 605 228 M461 194 Q484 170 511 181 Q552 199 566 219" fill="none" stroke="#8b6147" stroke-width="4" />
          <path d="M365 336 Q374 365 375 398 M714 336 Q705 365 706 398" fill="none" stroke-width="3" opacity="0.6" />
        </g>`,
      backHair: `
        <g class="female-outline female-hair">
          <path d="M540 201 C446 184 375 241 354 327 C346 360 345 404 357 447 L376 472 L386 369 Q415 272 540 265 Q665 272 694 369 L704 472 L723 447 C735 404 734 360 726 327 C705 241 634 184 540 201 Z" />
        </g>`,
      body: `
        <g class="female-outline">
          <path class="female-skin" d="M486 582 L594 582 L594 669 Q540 696 486 669 Z" />
          <path d="M486 598 Q540 630 594 598 L594 628 Q540 654 486 628 Z" fill="var(--skin-shadow)" stroke="none" />
          <path class="female-hoodie" d="M485 659 C449 657 407 690 378 750 L357 830 L339 1088 L741 1088 L723 830 L702 750 C673 690 631 657 595 659 Q540 710 485 659 Z" />
          <path d="M483 660 Q540 699 597 660 L600 675 Q540 718 480 675 Z" fill="var(--cloth-trim)" />
          <path d="M498 677 L494 686 M514 685 L512 696 M532 690 L532 701 M548 690 L548 701 M566 685 L568 696 M582 677 L586 686" fill="none" stroke="var(--cloth-shade)" stroke-width="2.6" />
          <path d="M528 710 L540 725 L552 710" fill="none" stroke="var(--cloth-trim)" stroke-width="3" />
          <path class="female-fold" d="M408 782 Q420 869 406 942 M672 782 Q660 869 674 942" style="stroke: var(--cloth-shade);" />
          <rect x="619" y="802" width="42" height="30" rx="8" fill="var(--cloth-trim)" stroke-width="3" />
          <path d="M629 820 L640 810 L651 820" fill="none" stroke="var(--cloth-shade)" stroke-width="3" />
          <path d="M342 1058 Q540 1076 738 1058 L741 1088 L339 1088 Z" fill="var(--cloth-shade)" />
          <path d="M365 1070 L363 1088 M390 1072 L389 1088 M417 1074 L416 1088 M444 1075 L444 1088 M471 1076 L471 1088 M498 1077 L498 1088 M525 1077 L525 1088 M552 1077 L552 1088 M579 1077 L579 1088 M606 1076 L606 1088 M633 1075 L633 1088 M660 1074 L661 1088 M687 1072 L688 1088 M714 1070 L716 1088" fill="none" stroke="var(--cloth-trim)" stroke-width="2.6" />
        </g>`,
      facePath: "M540 245 C454 241 402 291 385 361 L369 456 C366 499 376 541 398 575 L437 609 Q450 621 477 621 L603 621 Q630 621 643 609 L682 575 C704 541 714 499 711 456 L695 361 C678 291 626 241 540 245 Z",
      nosePath: "M531 492 L521 514 Q538 528 558 513",
      eyeScale: { x: 0.96, y: 0.9 },
      jewelry: false
    },
    {
      id: "zain",
      name: "Zain",
      gender: "male",
      outfit: "blazer",
      description: "Short dark curls, a broad squared jaw and a navy notched-lapel blazer over a light collared shirt.",
      palette: {
        skin: "#ce9271",
        hair: "#292a31",
        cloth: "#2d4167",
        shade: "#1d2f50",
        trim: "#e8e7df",
        outline: "#302a28",
        accent: "#c6aa72",
        skinShadow: "#af7255",
        lip: "#995d49",
        iris: "#39413b"
      },
      background: "night-grid",
      frontHair: `
        <g class="female-outline female-hair">
          <path d="M369 423 L354 368 Q336 350 344 326 Q322 306 339 286 Q328 260 349 246 Q345 216 370 206 Q374 182 401 184 Q419 158 446 172 Q462 143 489 159 Q513 139 537 159 Q562 137 586 155 Q612 143 630 164 Q657 151 675 175 Q699 174 709 200 Q737 212 731 238 Q756 258 742 282 Q760 307 743 329 Q751 354 731 372 L710 429 L695 411 L692 361 Q680 322 660 299 Q635 311 612 300 Q590 313 566 299 Q541 314 518 299 Q493 309 474 295 Q450 306 429 296 Q402 323 389 366 L383 418 Z" />
          <path d="M385 244 C371 227 389 211 407 222 C420 228 417 245 404 249 M435 206 C428 185 453 179 465 195 C474 205 464 220 452 219 M490 217 C480 200 504 186 518 202 C529 215 516 231 501 225 M542 195 C536 176 560 172 572 187 C584 201 571 217 557 211 M597 219 C590 201 613 191 625 206 C636 221 621 235 607 230 M651 216 C649 198 672 194 684 212 C694 228 679 238 667 230 M696 264 C690 246 712 237 721 253 C732 270 714 284 702 276" fill="none" stroke="#4e4b55" stroke-width="3.4" />
          <path d="M414 280 Q432 257 451 277 Q461 289 455 299 M477 270 Q491 251 507 271 Q514 283 506 293 M541 264 Q557 247 571 267 Q578 280 565 291 M605 273 Q622 255 635 276 Q641 288 632 298" fill="none" stroke="#4e4b55" stroke-width="3.4" />
        </g>`,
      backHair: `
        <g class="female-outline female-hair">
          <path d="M540 191 C449 178 365 226 349 309 C341 358 350 411 372 455 L384 429 L389 358 Q420 274 540 265 Q660 274 691 358 L696 429 L708 455 C730 411 739 358 731 309 C715 226 631 178 540 191 Z" />
        </g>`,
      body: `
        <g class="female-outline">
          <path class="female-skin" d="M488 582 L592 582 L592 669 Q540 692 488 669 Z" />
          <path d="M488 599 Q540 634 592 599 L592 628 Q540 651 488 628 Z" fill="var(--skin-shadow)" stroke="none" />
          <path class="female-hoodie" d="M470 657 C439 664 403 695 378 750 L357 837 L339 1088 L741 1088 L723 837 L702 750 C677 695 641 664 610 657 L591 664 Q540 704 489 664 Z" />
          <path d="M489 662 Q540 699 591 662 L610 711 L583 1088 L497 1088 L470 711 Z" fill="var(--cloth-trim)" />
          <path d="M488 651 L540 692 L516 731 L473 689 Z M592 651 L540 692 L564 731 L607 689 Z" fill="var(--cloth-trim)" />
          <path d="M470 663 L488 674 L515 731 L493 755 L524 810 L469 880 L421 715 L448 691 Z M610 663 L592 674 L565 731 L587 755 L556 810 L611 880 L659 715 L632 691 Z" fill="var(--cloth-shade)" />
          <path d="M540 741 L540 1088" fill="none" stroke="#c0bfb5" stroke-width="2.8" />
          <circle cx="540" cy="835" r="3.4" fill="var(--outline-color)" stroke="none" />
          <circle cx="540" cy="946" r="3.4" fill="var(--outline-color)" stroke="none" />
          <path class="female-fold" d="M489 811 Q501 892 500 1088 M591 811 Q579 892 580 1088 M402 790 Q414 860 401 941 M678 790 Q666 860 679 941" style="stroke: var(--cloth-shade);" />
          <path d="M609 834 L674 834 L671 858 Q640 869 612 858 Z" fill="var(--cloth-shade)" stroke-width="3.5" />
          <path d="M616 842 L667 842" fill="none" stroke="var(--cloth-trim)" stroke-width="2.6" opacity="0.65" />
          <circle cx="598" cy="941" r="5" fill="#c6aa72" stroke-width="2.6" />
          <circle cx="594" cy="1014" r="5" fill="#c6aa72" stroke-width="2.6" />
          <path class="female-fold" d="M342 1061 Q417 1073 496 1061 M584 1061 Q663 1073 738 1061" style="stroke: var(--cloth-shade);" />
        </g>`,
      facePath: "M540 245 C458 245 401 289 384 363 L368 456 C365 501 374 539 392 573 L425 605 Q440 621 464 621 L616 621 Q640 621 655 605 L688 573 C706 539 715 501 712 456 L696 363 C679 289 622 245 540 245 Z",
      nosePath: "M534 491 L526 514 Q540 527 556 514 M526 514 L523 518",
      eyeScale: { x: 0.92, y: 0.86 },
      jewelry: false
    },
    {
      id: "noor",
      name: "Noor",
      gender: "female",
      outfit: "sweater",
      description: "Short side-part tucked bob, a gold barrette and a lavender cable-knit sweater with a soft rounded collar.",
      palette: {
        skin: "#efb59b",
        hair: "#3c303d",
        cloth: "#b29aca",
        shade: "#886caa",
        trim: "#ddcae7",
        outline: "#302a28",
        accent: "#e6bd58",
        skinShadow: "#ce907a",
        lip: "#b57469",
        iris: "#51465a"
      },
      background: "sky-grid",
      frontHair: `
        <g class="female-outline female-hair">
          <path d="M559 192 C511 158 434 170 387 207 C343 247 323 315 329 389 L337 470 Q362 457 377 422 C393 391 405 332 432 295 C459 260 513 245 555 249 Q568 225 559 192 Z" />
          <path d="M559 192 C619 177 679 209 712 255 C745 300 753 369 746 445 L711 459 Q700 432 700 389 C699 335 674 294 637 272 Q603 254 555 249 Z" />
          <path d="M370 284 Q408 212 484 207 M613 217 Q687 241 718 334" fill="none" stroke="#675562" stroke-width="4" />
          <path d="M340 315 L367 304 Q372 304 375 309 L379 318 Q378 323 373 325 L347 337 Q341 338 339 332 L336 324 Q334 318 340 315 Z" fill="#e6bd58" stroke-width="3.2" />
          <path d="M344 321 L370 311" fill="none" stroke="#fff0c3" stroke-width="2.8" />
        </g>`,
      backHair: `
        <g class="female-outline female-hair">
          <path d="M541 182 C452 156 367 210 338 300 C316 370 317 451 328 511 L345 565 Q373 614 418 594 L441 561 L639 561 L662 594 Q707 616 735 566 L751 509 C765 438 761 354 737 294 C710 225 641 162 541 182 Z" />
          <path d="M344 413 Q341 495 365 551 Q380 572 399 574 M737 412 Q740 495 715 552 Q700 573 680 575" fill="none" stroke="#675562" stroke-width="4" />
        </g>`,
      body: `
        <g class="female-outline">
          <path class="female-skin" d="M497 582 L583 582 L583 669 Q540 694 497 669 Z" />
          <path d="M497 599 Q540 628 583 599 L583 630 Q540 651 497 630 Z" fill="var(--skin-shadow)" stroke="none" />
          <path class="female-hoodie" d="M494 659 C451 660 407 696 378 750 L357 835 L340 1088 L740 1088 L723 835 L702 750 C673 696 629 660 586 659 Q540 702 494 659 Z" />
          <path d="M491 659 Q540 692 589 659 L600 692 Q540 724 480 692 Z" fill="var(--cloth-trim)" />
          <path d="M495 678 L491 688 M509 685 L507 697 M525 690 L524 702 M541 691 L541 705 M557 690 L558 702 M573 685 L575 697 M587 678 L591 688" fill="none" stroke="var(--cloth-shade)" stroke-width="2.6" />
          <path d="M403 782 L418 797 L433 782 L448 797 L463 782 L478 797 L493 782 L508 797 L523 782 L538 797 L553 782 L568 797 L583 782 L598 797 L613 782 L628 797 L643 782 L658 797 L673 782" fill="none" stroke="var(--cloth-shade)" stroke-width="3" opacity="0.65" />
          <path d="M432 828 C411 852 453 873 432 897 C411 921 453 942 432 966 C411 990 453 1011 432 1035 M449 828 C470 852 428 873 449 897 C470 921 428 942 449 966 C470 990 428 1011 449 1035 M631 828 C610 852 652 873 631 897 C610 921 652 942 631 966 C610 990 652 1011 631 1035 M648 828 C669 852 627 873 648 897 C669 921 627 942 648 966 C669 990 627 1011 648 1035" fill="none" stroke="var(--cloth-shade)" stroke-width="3" opacity="0.6" />
          <path class="female-fold" d="M388 801 Q399 872 387 939 M692 801 Q681 872 693 939" style="stroke: var(--cloth-shade);" />
          <path d="M343 1054 Q540 1074 737 1054 L740 1088 L340 1088 Z" fill="var(--cloth-trim)" />
          <path d="M365 1066 L364 1088 M391 1069 L390 1088 M417 1071 L417 1088 M443 1073 L443 1088 M469 1074 L469 1088 M495 1075 L495 1088 M521 1076 L521 1088 M547 1076 L547 1088 M573 1075 L573 1088 M599 1074 L599 1088 M625 1073 L625 1088 M651 1071 L651 1088 M677 1069 L678 1088 M703 1066 L704 1088" fill="none" stroke="var(--cloth-shade)" stroke-width="2.6" />
        </g>`,
      facePath: "M540 245 C451 241 400 296 382 373 L371 465 C369 508 377 550 399 579 C421 606 455 621 493 621 L587 621 C625 621 659 606 681 579 C703 550 711 508 709 465 L698 373 C680 296 629 241 540 245 Z",
      nosePath: "M523 510 Q539 531 556 509",
      eyeScale: { x: 1, y: 0.94 },
      jewelry: false
    }
  ];

  const point = (values) => ({ x: values[0], y: values[1] });
  const anchor = (values) => ({ x: values[0], y: values[1], scale: values[2] ?? 1, rotation: values[3] ?? 0 });
  function rigMetrics(spec = {}) {
    const shoulders = spec.shoulders ?? [[378, 750], [702, 750]];
    const arms = spec.arms ?? [130, 138];
    const gesture = spec.gesture ?? [1, 1, 0, 0];
    const eyes = spec.eyes ?? [446, 434, 634, 434];
    const eyeScale = spec.eyeScale ?? [1, 1];
    const brows = spec.brows ?? [446, 350, 634, 350];
    const mouth = spec.mouth ?? [540, 564, 1, 1];
    const nose = spec.nose ?? [0, 0, 1, 1, 0, 540, 510];
    const wearables = spec.wearables ?? {};
    const earrings = wearables.earrings ?? [[360, 489], [720, 489], 1];
    return {
      shoulders: { left: point(shoulders[0]), right: point(shoulders[1]) },
      upperArmLength: arms[0],
      forearmLength: arms[1],
      gestureScale: { x: gesture[0], y: gesture[1] },
      offset: { x: gesture[2], y: gesture[3] },
      headPivot: point(spec.head ?? [540, 434]),
      eyeAnchors: { left: { x: eyes[0], y: eyes[1] }, right: { x: eyes[2], y: eyes[3] } },
      eyeScale: { x: eyeScale[0], y: eyeScale[1] },
      browAnchors: { left: { x: brows[0], y: brows[1] }, right: { x: brows[2], y: brows[3] } },
      mouthAnchor: { x: mouth[0], y: mouth[1] },
      mouthScale: { x: mouth[2], y: mouth[3] },
      noseTransform: { x: nose[0], y: nose[1], scaleX: nose[2], scaleY: nose[3], rotation: nose[4], pivot: { x: nose[5], y: nose[6] } },
      wearableAnchors: {
        glasses: anchor(wearables.glasses ?? [540, 434, 1, 0]),
        hat: anchor(wearables.hat ?? [540, 235, 1, 0]),
        earrings: { left: point(earrings[0]), right: point(earrings[1]), scale: earrings[2] ?? 1 },
        neckwear: anchor(wearables.neckwear ?? [540, 660, 1, 0])
      },
      handScale: spec.handScale ?? 1
    };
  }

  const classicFeatures = {
    ears: `<path class="female-skin" d="M374 450 C347 427 333 454 343 483 C348 501 359 511 378 504 M706 450 C733 427 747 454 737 483 C732 501 721 511 702 504" /><path d="M365 463 Q351 458 355 481 M715 463 Q729 458 725 481" fill="none" stroke="#cf8468" stroke-width="4" />`,
    details: `<path d="M540 246 C454 246 415 304 395 372 L382 462 Q381 505 387 524 C366 477 374 410 379 372 C397 295 450 239 540 245 Z" fill="var(--skin-shadow)" opacity="0.6" stroke="none" /><path d="M543 246 C625 249 665 304 685 372 L698 462 Q699 505 693 524 C714 477 706 410 701 372 C683 295 630 239 543 246 Z" fill="var(--skin-shadow)" opacity="0.45" stroke="none" />`,
    cheeks: `<ellipse cx="411" cy="525" rx="30" ry="12" fill="#de7e78" opacity="0.22" stroke="none" /><ellipse cx="669" cy="525" rx="30" ry="12" fill="#de7e78" opacity="0.22" stroke="none" />`,
    eyeLeft: `<ellipse cx="446" cy="434" rx="56" ry="70" fill="#ffffff" stroke-width="4" /><path d="M392 450 L382 445 M391 466 L381 466" fill="none" stroke-width="3.5" />`,
    eyeRight: `<ellipse cx="634" cy="434" rx="56" ry="70" fill="#ffffff" stroke-width="4" /><path d="M688 450 L698 445 M689 466 L699 466" fill="none" stroke-width="3.5" />`,
    pupilLeft: `<ellipse cx="446" cy="440" rx="27" ry="36" fill="var(--iris-color)" stroke="none" /><ellipse cx="446" cy="442" rx="18" ry="26" fill="#222425" stroke="none" /><ellipse cx="435" cy="419" rx="11" ry="14" fill="#ffffff" stroke="none" /><circle cx="457" cy="456" r="4" fill="#ffffff" stroke="none" />`,
    pupilRight: `<ellipse cx="634" cy="440" rx="27" ry="36" fill="var(--iris-color)" stroke="none" /><ellipse cx="634" cy="442" rx="18" ry="26" fill="#222425" stroke="none" /><ellipse cx="623" cy="419" rx="11" ry="14" fill="#ffffff" stroke="none" /><circle cx="645" cy="456" r="4" fill="#ffffff" stroke="none" />`,
    browLeft: `<path d="M393 355 Q437 327 486 339 Q493 348 493 359 Q437 350 393 369 Z" stroke-width="3.5" />`,
    browRight: `<path d="M687 355 Q643 327 594 339 Q587 348 587 359 Q643 350 687 369 Z" stroke-width="3.5" />`
  };
  const features = (overrides) => ({ ...classicFeatures, details: "", ...overrides });
  const palette = (skin, hair, cloth, shade, trim, accent, skinShadow, lip, iris, outline = "#302a28") => ({
    skin, hair, cloth, shade, trim, outline, accent, skinShadow, lip, iris
  });
  const categoryName = { human: "Human", cartoon: "Cartoon", mascot: "Mascot" };
  const profile = (data) => ({
    ...data,
    category: categoryName[data.kind],
    eyeScale: { ...data.rig.eyeScale },
    jewelry: data.accessories.earrings !== "none"
  });

  const originalRig = [
    rigMetrics(),
    rigMetrics({ shoulders: [[371, 752], [709, 752]], arms: [132, 140], gesture: [1.03, 0.99, 0, 2], eyeScale: [0.96, 0.9], mouth: [540, 565, 0.98, 0.96], wearables: { glasses: [540, 434, 0.98], hat: [540, 238, 1.02], earrings: [[365, 486], [715, 486], 0.96], neckwear: [540, 662, 1.04] } }),
    rigMetrics({ shoulders: [[365, 751], [715, 751]], arms: [136, 143], gesture: [1.06, 1.01, 0, 1], eyeScale: [0.92, 0.86], mouth: [540, 566, 1.03, 0.95], wearables: { glasses: [540, 432, 1.04], hat: [540, 232, 1.08], earrings: [[358, 488], [722, 488], 1], neckwear: [540, 662, 1.08] } }),
    rigMetrics({ shoulders: [[382, 752], [698, 752]], arms: [126, 135], gesture: [0.97, 1.02, 0, 0], eyeScale: [1, 0.94], mouth: [540, 565, 0.96, 0.94], wearables: { glasses: [540, 432, 0.98], hat: [540, 238, 1], earrings: [[371, 487], [709, 487], 0.92], neckwear: [540, 660, 0.96] } })
  ];
  const originalSources = [
    "https://codepen.io/alvaromontoro/full/xxRKgRZ",
    "https://codepen.io/alvaromontoro/pen/WNGEjMz",
    "https://codepen.io/alvaromontoro/pen/mdmzojb",
    "https://codepen.io/alvaromontoro/full/xxRKgRZ"
  ];
  const originalAccessories = [
    { earrings: "drops", neckwear: "none" },
    { earrings: "none", neckwear: "none" },
    { earrings: "none", neckwear: "tie" },
    { earrings: "none", neckwear: "none" }
  ];
  const originalProfiles = baseAvatars.map((avatar, index) => profile({
    ...avatar,
    kind: "human",
    source: originalSources[index],
    features: { ...classicFeatures },
    rig: originalRig[index],
    accessories: originalAccessories[index]
  }));

  const newProfiles = [
    profile({
      id: "squircle", name: "Squircle", gender: "neutral", kind: "cartoon", outfit: "hoodie",
      description: "A soft square-headed presenter with oversized capsule eyes, a tiny curl and compact rounded shoulders.",
      source: "https://codepen.io/alvaromontoro/full/WNGEjMz",
      palette: palette("#f6b79c", "#2f3451", "#ff735f", "#c9484a", "#ffc5a8", "#ffe07a", "#d88e78", "#b65d63", "#3b5674"), background: "sky-grid",
      backHair: `<g class="female-outline female-hair"><rect x="350" y="186" width="380" height="430" rx="132" /><path d="M382 527 Q350 614 389 681 M698 527 Q730 614 691 681" fill="none" stroke="var(--outline-color)" stroke-width="12" /></g>`,
      frontHair: `<g class="female-outline female-hair"><path d="M363 299 Q382 173 517 175 Q638 162 717 282 L686 323 Q617 250 544 259 Q458 248 390 329 Z" /><path d="M513 179 Q523 130 558 151 Q579 170 551 198" fill="none" stroke="var(--outline-color)" stroke-width="14" /></g>`,
      body: `<g class="female-outline"><path class="female-skin" d="M492 596 L588 596 L588 674 Q540 701 492 674 Z" /><path class="female-hoodie" d="M397 706 Q445 657 493 661 Q540 700 587 661 Q635 657 683 706 L737 1088 L343 1088 Z" /><path d="M493 662 Q540 704 587 662 L605 700 Q540 741 475 700 Z" fill="var(--cloth-trim)" /><rect x="470" y="841" width="140" height="88" rx="42" fill="var(--cloth-shade)" /><path d="M493 711 L480 809 M587 711 L600 809" fill="none" stroke="var(--cloth-trim)" stroke-width="6" /></g>`,
      facePath: "M536 236 C424 232 365 298 365 408 L365 510 C365 590 420 631 507 631 L573 631 C660 631 715 590 715 510 L715 408 C715 298 648 232 536 236 Z",
      nosePath: "M527 506 Q540 519 553 506", features: features({
        ears: `<rect x="337" y="421" width="55" height="107" rx="27" class="female-skin" /><rect x="688" y="421" width="55" height="107" rx="27" class="female-skin" />`,
        cheeks: `<ellipse cx="418" cy="528" rx="34" ry="15" fill="#e97f82" opacity="0.3" stroke="none" /><ellipse cx="662" cy="528" rx="34" ry="15" fill="#e97f82" opacity="0.3" stroke="none" />`,
        eyeLeft: `<rect x="390" y="386" width="116" height="92" rx="46" fill="#ffffff" stroke-width="5" />`, eyeRight: `<rect x="574" y="386" width="116" height="92" rx="46" fill="#ffffff" stroke-width="5" />`,
        pupilLeft: `<ellipse cx="448" cy="434" rx="25" ry="34" fill="var(--iris-color)" stroke="none" /><circle cx="440" cy="422" r="9" fill="#ffffff" stroke="none" />`, pupilRight: `<ellipse cx="632" cy="434" rx="25" ry="34" fill="var(--iris-color)" stroke="none" /><circle cx="624" cy="422" r="9" fill="#ffffff" stroke="none" />`,
        browLeft: `<rect x="397" y="344" width="105" height="15" rx="8" />`, browRight: `<rect x="578" y="344" width="105" height="15" rx="8" />`
      }),
      rig: rigMetrics({ shoulders: [[397, 755], [683, 755]], arms: [118, 127], gesture: [0.9, 0.92, 0, 10], head: [540, 438], eyes: [448, 432, 632, 432], eyeScale: [1.04, 0.9], brows: [450, 352, 630, 352], mouth: [540, 574, 0.9, 0.82], nose: [0, 0, 0.9, 0.8, 0, 540, 507], wearables: { glasses: [540, 433, 0.94], hat: [540, 230, 0.94], earrings: [[365, 474], [715, 474], 0.9], neckwear: [540, 668, 0.9] }, handScale: 0.92 }),
      accessories: { earrings: "studs", neckwear: "none" }
    }),
    profile({
      id: "css-person", name: "CSS Person", gender: "female", kind: "human", outfit: "tshirt",
      description: "A long pear-shaped CSS portrait with narrow almond eyes, an asymmetric copper sweep and a high V-neck.",
      source: "https://codepen.io/alvaromontoro/pen/WNGEjMz",
      palette: palette("#d98f6f", "#b84f35", "#326f82", "#214c5d", "#72aeba", "#f4c86a", "#ba6e55", "#a64d4b", "#2c5868"), background: "cream-grid",
      backHair: `<g class="female-outline female-hair"><path d="M405 234 Q540 118 681 235 L723 512 Q706 625 642 676 L618 579 L456 579 L430 676 Q365 616 354 510 Z" /></g>`,
      frontHair: `<g class="female-outline female-hair"><path d="M385 333 Q386 187 523 182 Q660 164 707 305 Q637 262 575 294 Q500 329 407 420 Z" /><path d="M538 183 Q621 173 685 239" fill="none" stroke="#e27855" stroke-width="12" /></g>`,
      body: `<g class="female-outline"><path class="female-skin" d="M500 600 L580 600 L580 681 Q540 711 500 681 Z" /><path class="female-hoodie" d="M382 737 Q430 672 497 672 L540 708 L583 672 Q650 672 698 737 L748 1088 L332 1088 Z" /><path d="M493 672 L540 727 L587 672" fill="none" stroke="var(--cloth-trim)" stroke-width="12" /><path d="M370 1048 Q540 1072 710 1048" fill="none" stroke="var(--cloth-shade)" stroke-width="18" /></g>`,
      facePath: "M528 218 C432 222 386 292 390 407 L404 511 C414 583 461 633 540 650 C619 633 666 583 676 511 L690 407 C694 292 624 210 528 218 Z",
      nosePath: "M538 449 L519 518 Q538 535 562 516", features: features({
        ears: `<ellipse cx="388" cy="469" rx="30" ry="55" class="female-skin" /><ellipse cx="692" cy="469" rx="30" ry="55" class="female-skin" />`,
        cheeks: `<path d="M421 535 Q453 549 478 532 M602 532 Q627 549 659 535" fill="none" stroke="#d87070" stroke-width="9" opacity="0.28" />`,
        eyeLeft: `<path d="M415 420 Q455 376 500 421 Q459 461 415 420 Z" fill="#ffffff" stroke-width="5" />`, eyeRight: `<path d="M580 421 Q625 376 665 420 Q621 461 580 421 Z" fill="#ffffff" stroke-width="5" />`,
        pupilLeft: `<circle cx="458" cy="421" r="22" fill="var(--iris-color)" stroke="none" /><circle cx="451" cy="414" r="7" fill="#ffffff" stroke="none" />`, pupilRight: `<circle cx="622" cy="421" r="22" fill="var(--iris-color)" stroke="none" /><circle cx="615" cy="414" r="7" fill="#ffffff" stroke="none" />`,
        browLeft: `<path d="M414 365 Q457 339 503 361" fill="none" stroke="var(--hair-color)" stroke-width="16" />`, browRight: `<path d="M577 361 Q623 339 666 365" fill="none" stroke="var(--hair-color)" stroke-width="16" />`
      }),
      rig: rigMetrics({ shoulders: [[382, 756], [698, 756]], arms: [131, 145], gesture: [1.01, 1.04, 0, 7], head: [540, 448], eyes: [458, 421, 622, 421], eyeScale: [1.06, 0.78], brows: [458, 361, 622, 361], mouth: [540, 585, 0.88, 0.86], nose: [0, 0, 1, 1.04, 0, 540, 500], wearables: { glasses: [540, 422, 0.94], hat: [540, 215, 1], earrings: [[387, 471], [693, 471], 0.9], neckwear: [540, 674, 0.94] } }),
      accessories: { earrings: "hoops", neckwear: "none" }
    }),
    profile({
      id: "bearded-man", name: "Bearded Man", gender: "male", kind: "cartoon", outfit: "crewneck",
      description: "A broad mustached speaker with a tall forehead, close green eyes, rounded beard and heavy swept hair.",
      source: "https://www.youtube.com/watch?v=-mpljs6dXEs",
      palette: palette("#f0bd93", "#66351f", "#d9ddd8", "#a8b0aa", "#ffffff", "#87a66c", "#cf9471", "#9d5b50", "#6f925d"), background: "cream-grid",
      backHair: `<g class="female-outline female-hair"><path d="M347 375 Q340 218 455 168 Q540 122 635 173 Q747 230 731 389 L684 444 L397 444 Z" /></g>`,
      frontHair: `<g class="female-outline female-hair"><path d="M369 337 Q390 176 541 170 Q685 164 716 326 Q649 273 574 288 Q487 306 397 389 Z" /><path d="M397 258 Q466 187 547 203 M574 205 Q642 205 683 264" fill="none" stroke="#8a563a" stroke-width="13" /></g>`,
      body: `<g class="female-outline"><path class="female-skin" d="M474 613 L606 613 L606 688 Q540 724 474 688 Z" /><path class="female-hoodie" d="M354 754 Q401 680 477 675 Q540 718 603 675 Q679 680 726 754 L768 1088 L312 1088 Z" /><path d="M466 680 Q540 742 614 680" fill="none" stroke="var(--cloth-shade)" stroke-width="18" /><rect x="440" y="886" width="200" height="104" rx="24" fill="var(--cloth-shade)" opacity="0.45" /></g>`,
      facePath: "M540 235 C435 232 380 307 384 421 L397 526 C407 604 461 646 540 651 C619 646 673 604 683 526 L696 421 C700 307 645 232 540 235 Z",
      nosePath: "M526 464 L513 519 Q540 543 568 519 L555 464", features: features({
        ears: `<ellipse cx="381" cy="470" rx="35" ry="64" class="female-skin" /><ellipse cx="699" cy="470" rx="35" ry="64" class="female-skin" />`,
        details: `<path d="M422 514 Q540 470 658 514 L668 579 Q632 650 540 661 Q448 650 412 579 Z" fill="var(--hair-color)" stroke="var(--outline-color)" stroke-width="5" /><path d="M455 539 Q499 515 540 548 Q581 515 625 539 Q593 574 540 558 Q487 574 455 539 Z" fill="#4d281b" stroke="var(--outline-color)" stroke-width="4" />`,
        cheeks: `<circle cx="424" cy="518" r="18" fill="#d98372" opacity="0.18" stroke="none" /><circle cx="656" cy="518" r="18" fill="#d98372" opacity="0.18" stroke="none" />`,
        eyeLeft: `<ellipse cx="454" cy="421" rx="58" ry="36" fill="#ffffff" stroke-width="5" />`, eyeRight: `<ellipse cx="626" cy="421" rx="58" ry="36" fill="#ffffff" stroke-width="5" />`,
        pupilLeft: `<circle cx="458" cy="426" r="20" fill="var(--iris-color)" stroke="none" /><circle cx="452" cy="419" r="6" fill="#ffffff" stroke="none" />`, pupilRight: `<circle cx="622" cy="426" r="20" fill="var(--iris-color)" stroke="none" /><circle cx="616" cy="419" r="6" fill="#ffffff" stroke="none" />`,
        browLeft: `<path d="M397 368 Q451 332 507 365" fill="none" stroke="var(--hair-color)" stroke-width="21" />`, browRight: `<path d="M573 365 Q629 332 683 368" fill="none" stroke="var(--hair-color)" stroke-width="21" />`
      }),
      rig: rigMetrics({ shoulders: [[354, 758], [726, 758]], arms: [143, 149], gesture: [1.12, 1.05, 0, 8], head: [540, 448], eyes: [454, 421, 626, 421], eyeScale: [1.03, 0.74], brows: [454, 362, 626, 362], mouth: [540, 596, 0.78, 0.76], nose: [0, 0, 1.08, 1.02, 0, 540, 500], wearables: { glasses: [540, 421, 1], hat: [540, 224, 1.08], earrings: [[381, 478], [699, 478], 1], neckwear: [540, 686, 1.08] }, handScale: 1.04 }),
      accessories: { earrings: "none", neckwear: "chain" }
    }),
    profile({
      id: "curly-boy", name: "Curly Boy", gender: "male", kind: "cartoon", outfit: "tshirt",
      description: "Reference-matched young man with a tapered peach face, large ears, bright blue eyes, thick brows, a dense scalloped brown curl cap and plain white T-shirt.",
      source: "https://codepen.io/alvaromontoro/pen/mdmzojb",
      palette: palette("#f7c7a4", "#985f2f", "#f9fbfd", "#d6e0e7", "#eef3f6", "#79aeda", "#df9e7c", "#b66c65", "#3f85bd"), background: "cream-grid",
      backHair: `<g class="female-outline female-hair"><path d="M350 382 Q322 278 382 222 Q438 150 540 145 Q642 150 698 222 Q758 278 730 382 L690 432 L390 432 Z"/></g>`,
      frontHair: `<g class="female-outline female-hair"><path d="M358 371 Q335 333 361 304 Q344 263 382 242 Q380 198 424 185 Q444 145 489 161 Q522 124 560 153 Q604 128 630 166 Q679 164 692 207 Q735 221 727 264 Q756 296 730 330 Q738 367 698 390 L690 330 Q655 310 629 300 Q584 318 540 315 Q496 318 451 299 Q409 306 382 331 L374 390 Z"/><circle cx="384" cy="272" r="48"/><circle cx="420" cy="218" r="54"/><circle cx="474" cy="185" r="55"/><circle cx="531" cy="174" r="57"/><circle cx="589" cy="184" r="56"/><circle cx="644" cy="211" r="55"/><circle cx="690" cy="258" r="51"/><path d="M376 318 Q410 276 447 291 Q492 316 540 306 Q590 315 634 291 Q675 278 704 319 Q681 334 662 348 Q624 326 590 330 Q540 346 490 330 Q450 326 417 349 Q394 337 376 318 Z"/><path d="M393 257 Q421 215 456 220 M488 183 Q522 154 553 181 M587 187 Q620 170 647 204 M658 240 Q692 244 708 276" fill="none" stroke="#c4864d" stroke-width="9" opacity="0.72"/></g>`,
      body: `<g class="female-outline"><path class="female-skin" d="M482 650 L598 650 L610 758 L470 758 Z"/><path class="female-hoodie" d="M250 1088 L280 842 Q300 770 435 742 L470 724 Q540 770 610 724 L645 742 Q780 770 800 842 L830 1088 Z"/><path d="M430 744 Q540 810 650 744" fill="none" stroke="var(--cloth-shade)" stroke-width="8"/><path d="M323 834 Q353 797 424 780 M757 834 Q727 797 656 780" fill="none" stroke="var(--cloth-trim)" stroke-width="9" opacity="0.75"/></g>`,
      facePath: "M388 326 Q404 262 468 244 Q540 222 612 244 Q676 262 692 326 L702 493 Q690 600 622 657 Q584 690 540 696 Q496 690 458 657 Q390 600 378 493 Z",
      nosePath: "M522 500 Q540 516 558 500", features: features({
        details: `<path d="M406 493 Q423 617 516 672 Q454 653 419 601 Q392 559 391 502 Z" fill="var(--skin-shadow)" opacity="0.18" stroke="none"/><path d="M493 535 L501 538 M540 540 L548 538 M585 535 L593 532" fill="none" stroke="#c8836d" stroke-width="3.4" opacity="0.55"/>`,
        ears: `<path class="female-skin" d="M391 404 Q344 386 326 428 Q310 475 338 514 Q360 542 391 524 Q374 484 391 404 Z"/><path class="female-skin" d="M689 404 Q736 386 754 428 Q770 475 742 514 Q720 542 689 524 Q706 484 689 404 Z"/><path d="M354 438 Q330 459 354 488 Q368 501 382 486 M726 438 Q750 459 726 488 Q712 501 698 486" fill="none" stroke="#b97962" stroke-width="6"/>`,
        cheeks: `<path d="M406 556 Q434 572 462 557 M618 557 Q646 572 674 556" fill="none" stroke="#df9e7c" stroke-width="5" opacity=".6"/>`,
        eyeLeft: `<rect x="393" y="353" width="122" height="160" rx="56" fill="#ffffff" stroke-width="6"/>`, eyeRight: `<rect x="565" y="353" width="122" height="160" rx="56" fill="#ffffff" stroke-width="6"/>`,
        pupilLeft: `<ellipse cx="454" cy="438" rx="35" ry="45" fill="var(--iris-color)" stroke="none"/><ellipse cx="454" cy="442" rx="20" ry="28" fill="#173448" stroke="none"/><circle cx="442" cy="423" r="9" fill="#ffffff" stroke="none"/><circle cx="462" cy="456" r="4" fill="#ffffff" stroke="none"/>`, pupilRight: `<ellipse cx="626" cy="438" rx="35" ry="45" fill="var(--iris-color)" stroke="none"/><ellipse cx="626" cy="442" rx="20" ry="28" fill="#173448" stroke="none"/><circle cx="614" cy="423" r="9" fill="#ffffff" stroke="none"/><circle cx="634" cy="456" r="4" fill="#ffffff" stroke="none"/>`,
        browLeft: `<path d="M397 329 Q454 295 510 328" fill="none" stroke="#2f2929" stroke-width="18"/>`, browRight: `<path d="M570 328 Q626 295 683 329" fill="none" stroke="#2f2929" stroke-width="18"/>`
      }),
      rig: rigMetrics({ shoulders: [[315, 758], [765, 758]], arms: [132, 138], gesture: [1.05, 1.03, 0, 8], head: [540, 414], eyes: [454, 433, 626, 433], eyeScale: [1, 1], brows: [454, 323, 626, 323], mouth: [540, 582, 0.82, 0.78], nose: [0, 0, 1, 1, 0, 540, 500], wearables: { glasses: [540, 433, 1], hat: [540, 218, 1.04], earrings: [[338, 468], [742, 468], 0.94], neckwear: [540, 724, 1.04] }, handScale: 1.02 }),
      accessories: { earrings: "none", neckwear: "none" }
    }),
    profile({
      id: "cap-guy", name: "Cap Guy", gender: "male", kind: "cartoon", outfit: "tshirt",
      description: "A peach three-quarter portrait with connected eyes, a projecting nose, burgundy baseball cap and powder-blue white tee.",
      source: "https://reference.invalid/cap-guy",
      palette: palette("#f4b28e", "#342f34", "#f8fafc", "#c7dceb", "#eaf3f8", "#8ebbd8", "#d88e6c", "#aa5f5c", "#283441"), background: "sky-grid",
      backHair: `<g class="female-outline"><path d="M374 339 Q361 212 474 164 Q592 113 694 197 Q735 232 736 300 L697 353 Z" fill="#6f2439"/><path d="M414 239 Q499 154 613 176 Q672 187 706 232" fill="none" stroke="#98405a" stroke-width="13"/><path d="M405 330 Q390 387 407 425 L452 399 L451 325 Z" fill="#342f34"/></g>`,
      frontHair: `<g class="female-outline"><path d="M392 311 Q471 255 687 286 L760 332 Q639 359 506 330 L396 340 Z" fill="#3d404a"/><path d="M379 301 Q397 196 500 171 Q613 143 700 224 L705 289 Q568 251 392 319 Z" fill="#7d2943"/><path d="M519 174 Q529 226 526 286" fill="none" stroke="#a95068" stroke-width="8"/><path d="M405 273 Q461 202 526 197" fill="none" stroke="#b96578" stroke-width="8" opacity="0.55"/><path d="M396 316 Q517 288 676 309" fill="none" stroke="#565a66" stroke-width="8" opacity="0.8"/></g>`,
      body: `<g class="female-outline"><path class="female-skin" d="M497 616 L611 618 L626 760 L477 760 Z"/><path d="M498 631 Q551 661 611 632 L614 694 Q551 722 489 686 Z" fill="var(--skin-shadow)" stroke="none" opacity="0.52"/><path class="female-hoodie" d="M299 1088 L322 839 Q341 777 455 741 L478 724 Q550 778 624 724 L650 742 Q761 778 786 839 L817 1088 Z"/><path d="M442 742 Q550 807 660 742" fill="none" stroke="var(--cloth-shade)" stroke-width="10"/><path d="M335 848 Q384 810 438 795 M748 848 Q699 810 646 795" fill="none" stroke="var(--cloth-trim)" stroke-width="11" opacity="0.8"/></g>`,
      facePath: "M482 267 C420 274 391 335 397 431 L410 517 C419 595 469 637 548 644 C615 649 673 613 692 552 L714 477 C727 413 703 337 646 293 C602 259 537 254 482 267 Z",
      nosePath: "M553 438 C590 443 610 467 598 491 C588 510 556 514 538 496", features: features({
        ears: `<path class="female-skin" d="M408 391 Q344 368 323 421 Q307 469 336 514 Q363 548 413 520 Q390 471 408 391 Z"/><path d="M365 416 Q333 438 350 477 Q363 502 391 488 Q374 458 388 430" fill="none" stroke="#bd735d" stroke-width="6"/><path class="female-skin" d="M688 420 Q724 405 733 443 Q739 476 707 493"/>`,
        details: `<path d="M410 476 Q414 588 501 633 Q446 618 423 574 Q407 543 404 494 Z" fill="var(--skin-shadow)" opacity="0.2" stroke="none"/><path d="M656 318 Q689 367 699 425" fill="none" stroke="#ffd7bd" stroke-width="5" opacity="0.34"/>`,
        cheeks: `<ellipse cx="464" cy="528" rx="33" ry="13" fill="#df806f" opacity="0.2" stroke="none"/><ellipse cx="642" cy="524" rx="25" ry="11" fill="#df806f" opacity="0.16" stroke="none"/>`,
        eyeLeft: `<ellipse cx="475" cy="414" rx="70" ry="60" fill="#ffffff" stroke-width="6"/>`, eyeRight: `<ellipse cx="591" cy="412" rx="65" ry="58" fill="#ffffff" stroke-width="6"/>`,
        pupilLeft: `<circle cx="491" cy="425" r="10" fill="#1f2730" stroke="none"/><circle cx="488" cy="421" r="3.5" fill="#ffffff" stroke="none"/>`, pupilRight: `<circle cx="579" cy="423" r="9" fill="#1f2730" stroke="none"/><circle cx="576" cy="419" r="3" fill="#ffffff" stroke="none"/>`,
        browLeft: `<path d="M415 346 Q473 317 526 339" fill="none" stroke="#26252a" stroke-width="17"/>`, browRight: `<path d="M548 338 Q604 315 650 347" fill="none" stroke="#26252a" stroke-width="16"/>`
      }),
      rig: rigMetrics({ shoulders: [[322, 762], [758, 762]], arms: [137, 145], gesture: [1.07, 1.03, 2, 10], head: [553, 430], eyes: [475, 414, 591, 412], eyeScale: [1, 0.9], brows: [475, 342, 599, 342], mouth: [558, 574, 0.56, 0.58], nose: [0, 0, 1, 1, 0, 570, 475], wearables: { glasses: [535, 414, 0.75, -1], hat: [545, 231, 0.88, -5], earrings: [[355, 468], [713, 461], 0.86], neckwear: [552, 724, 0.98] }, handScale: 1.02 }),
      accessories: { earrings: "none", neckwear: "none" }
    }),
    profile({
      id: "pompadour-guy", name: "Pompadour Guy", gender: "male", kind: "cartoon", outfit: "tshirt",
      description: "A friendly rounded presenter with a towering black pompadour, compact features, long neck and crisp white T-shirt.",
      source: "https://reference.invalid/pompadour-guy",
      palette: palette("#f3b38f", "#17191d", "#fbfcfb", "#cfe7df", "#e8f4ef", "#73bea8", "#d88d6d", "#a95d59", "#493b32"), background: "cream-grid",
      backHair: `<g class="female-outline female-hair"><path d="M379 367 Q347 250 405 176 Q446 121 505 125 Q548 67 615 108 Q679 101 716 159 Q760 228 722 356 L685 405 L403 407 Z"/><path d="M414 211 Q458 139 526 151 Q578 99 635 137 Q687 142 708 210" fill="none" stroke="#35383d" stroke-width="13"/></g>`,
      frontHair: `<g class="female-outline female-hair"><path d="M389 338 Q367 253 418 194 Q457 146 516 157 Q551 99 614 132 Q680 120 713 183 Q746 247 706 324 Q654 278 588 292 Q492 327 404 395 Z"/><path d="M411 278 Q448 195 522 210 M527 209 Q579 142 636 177 M630 182 Q688 181 711 238" fill="none" stroke="#41444a" stroke-width="11" opacity="0.78"/></g>`,
      body: `<g class="female-outline"><path class="female-skin" d="M488 604 L592 604 L608 758 L472 758 Z"/><path d="M489 619 Q540 650 592 619 L598 684 Q540 716 482 683 Z" fill="var(--skin-shadow)" stroke="none" opacity="0.46"/><path class="female-hoodie" d="M283 1088 L314 838 Q337 772 449 742 L472 724 Q540 776 608 724 L632 742 Q744 772 767 838 L797 1088 Z"/><path d="M440 742 Q540 804 640 742" fill="none" stroke="var(--cloth-shade)" stroke-width="10"/><path d="M330 835 Q382 800 440 788 M750 835 Q698 800 640 788" fill="none" stroke="var(--cloth-trim)" stroke-width="10" opacity="0.76"/></g>`,
      facePath: "M540 251 C445 251 394 313 397 422 L410 514 C420 589 473 632 540 641 C607 632 660 589 670 514 L683 422 C686 313 635 251 540 251 Z",
      nosePath: "M528 455 Q514 487 532 499 Q550 506 560 491", features: features({
        ears: `<ellipse cx="391" cy="466" rx="43" ry="62" class="female-skin"/><path d="M374 445 Q397 428 410 455 Q416 480 393 494" fill="none" stroke="#bb735e" stroke-width="6"/><ellipse cx="688" cy="462" rx="31" ry="51" class="female-skin"/>`,
        details: `<path d="M411 477 Q425 588 508 631 Q447 616 421 566 Q406 535 405 493 Z" fill="var(--skin-shadow)" opacity="0.18" stroke="none"/><path d="M650 329 Q674 378 671 431" fill="none" stroke="#ffdbc2" stroke-width="5" opacity="0.32"/>`,
        cheeks: `<ellipse cx="445" cy="524" rx="27" ry="12" fill="#dd7d70" opacity="0.2" stroke="none"/><ellipse cx="635" cy="524" rx="27" ry="12" fill="#dd7d70" opacity="0.2" stroke="none"/>`,
        eyeLeft: `<path d="M438 414 Q475 387 512 414 Q476 442 438 414 Z" fill="#fffefd" stroke-width="5"/>`, eyeRight: `<path d="M568 414 Q605 387 642 414 Q604 442 568 414 Z" fill="#fffefd" stroke-width="5"/>`,
        pupilLeft: `<ellipse cx="477" cy="417" rx="10" ry="14" fill="var(--iris-color)" stroke="none"/><circle cx="474" cy="412" r="3.5" fill="#ffffff" stroke="none"/>`, pupilRight: `<ellipse cx="603" cy="417" rx="10" ry="14" fill="var(--iris-color)" stroke="none"/><circle cx="600" cy="412" r="3.5" fill="#ffffff" stroke="none"/>`,
        browLeft: `<path d="M432 370 Q475 346 519 366" fill="none" stroke="var(--hair-color)" stroke-width="14"/>`, browRight: `<path d="M561 366 Q605 346 648 370" fill="none" stroke="var(--hair-color)" stroke-width="14"/>`
      }),
      rig: rigMetrics({ shoulders: [[314, 758], [766, 758]], arms: [140, 146], gesture: [1.08, 1.02, 0, 8], head: [540, 430], eyes: [477, 414, 603, 414], eyeScale: [0.9, 0.7], brows: [477, 367, 603, 367], mouth: [540, 569, 0.82, 0.68], nose: [0, 0, 0.84, 0.9, 0, 540, 482], wearables: { glasses: [540, 414, 0.75], hat: [540, 198, 0.9], earrings: [[391, 469], [688, 465], 0.82], neckwear: [540, 720, 1] }, handScale: 1.01 }),
      accessories: { earrings: "none", neckwear: "none" }
    }),
    profile({
      id: "soft-bust", name: "Soft Bust", gender: "male", kind: "human", outfit: "tshirt",
      description: "An understated young man with a compact wavy quiff, warm highlighted eyes, tapered neck and softly fading pale T-shirt.",
      source: "https://reference.invalid/soft-bust",
      palette: palette("#efb795", "#49372d", "#f1f2f2", "#d9dedd", "#fafafa", "#aab7b2", "#cf8e70", "#a5655d", "#79563f"), background: "solid-white",
      backHair: `<g class="female-outline female-hair"><path d="M414 380 Q389 284 439 226 Q486 178 552 185 Q624 178 670 238 Q705 289 680 382 L650 414 L430 414 Z"/></g>`,
      frontHair: `<g class="female-outline female-hair"><path d="M421 341 Q411 264 459 220 Q499 185 548 207 Q588 174 626 209 Q674 222 679 284 Q641 254 608 276 Q566 305 521 283 Q474 280 435 359 Z"/><path d="M451 266 Q482 214 526 234 M533 232 Q568 196 604 229 M596 236 Q635 226 659 257" fill="none" stroke="#705447" stroke-width="8" opacity="0.72"/></g>`,
      body: `<g class="female-outline"><path class="female-skin" d="M503 595 L577 595 L594 744 L486 744 Z"/><path d="M504 609 Q540 631 577 609 L583 674 Q540 697 497 674 Z" fill="var(--skin-shadow)" stroke="none" opacity="0.4"/><path class="female-hoodie" d="M322 1088 L344 836 Q362 779 459 746 L486 726 Q540 767 594 726 L621 746 Q718 779 736 836 L758 1088 Z"/><path d="M454 746 Q540 793 626 746" fill="none" stroke="var(--cloth-shade)" stroke-width="8"/><path d="M359 930 Q540 977 721 930 L743 1088 L337 1088 Z" fill="var(--cloth-trim)" opacity="0.28" stroke="none"/><path d="M376 826 Q411 792 461 780 M704 826 Q669 792 619 780" fill="none" stroke="var(--cloth-trim)" stroke-width="8" opacity="0.72"/></g>`,
      facePath: "M540 262 C463 262 420 315 421 413 L432 505 C440 574 483 611 540 620 C597 611 640 574 648 505 L659 413 C660 315 617 262 540 262 Z",
      nosePath: "M532 452 Q521 489 540 496 Q553 496 560 484", features: features({
        ears: `<ellipse cx="420" cy="459" rx="30" ry="48" class="female-skin"/><ellipse cx="660" cy="459" rx="30" ry="48" class="female-skin"/><path d="M411 445 Q425 434 434 454 M669 445 Q655 434 646 454" fill="none" stroke="#bd7962" stroke-width="4"/>`,
        details: `<path d="M434 475 Q449 568 516 610 Q466 596 446 560 Q431 530 429 492 Z" fill="var(--skin-shadow)" opacity="0.16" stroke="none"/><path d="M628 328 Q647 370 648 410" fill="none" stroke="#ffe0ca" stroke-width="4" opacity="0.28"/>`,
        cheeks: `<ellipse cx="457" cy="514" rx="21" ry="9" fill="#dc8375" opacity="0.14" stroke="none"/><ellipse cx="623" cy="514" rx="21" ry="9" fill="#dc8375" opacity="0.14" stroke="none"/>`,
        eyeLeft: `<path d="M449 411 Q480 383 513 409 Q482 439 449 411 Z" fill="#fffdfa" stroke-width="4"/>`, eyeRight: `<path d="M567 409 Q600 383 631 411 Q598 439 567 409 Z" fill="#fffdfa" stroke-width="4"/>`,
        pupilLeft: `<ellipse cx="482" cy="412" rx="15" ry="19" fill="var(--iris-color)" stroke="none"/><ellipse cx="479" cy="416" rx="7" ry="10" fill="#2e231f" stroke="none"/><circle cx="476" cy="405" r="4.5" fill="#ffffff" stroke="none"/>`, pupilRight: `<ellipse cx="598" cy="412" rx="15" ry="19" fill="var(--iris-color)" stroke="none"/><ellipse cx="601" cy="416" rx="7" ry="10" fill="#2e231f" stroke="none"/><circle cx="594" cy="405" r="4.5" fill="#ffffff" stroke="none"/>`,
        browLeft: `<path d="M446 366 Q480 347 516 363" fill="none" stroke="var(--hair-color)" stroke-width="11"/>`, browRight: `<path d="M564 363 Q600 347 634 366" fill="none" stroke="var(--hair-color)" stroke-width="11"/>`
      }),
      rig: rigMetrics({ shoulders: [[344, 758], [736, 758]], arms: [132, 140], gesture: [1.02, 1, 0, 7], head: [540, 431], eyes: [482, 411, 598, 411], eyeScale: [0.86, 0.78], brows: [482, 364, 598, 364], mouth: [540, 550, 0.58, 0.56], nose: [0, 0, 0.76, 0.82, 0, 540, 480], wearables: { glasses: [540, 411, 0.66], hat: [540, 255, 0.76], earrings: [[420, 461], [660, 461], 0.7], neckwear: [540, 704, 0.82] }, handScale: 0.94 }),
      accessories: { earrings: "none", neckwear: "none" }
    }),
    profile({
      id: "blond-swept", name: "Blond Swept", gender: "male", kind: "human", outfit: "crewneck",
      description: "A premium swept-blond portrait with layered gold hair, dimensional tan face, vivid cyan eyes, freckles and blue crew shirt.",
      source: "https://reference.invalid/blond-swept",
      palette: palette("#e8a879", "#d99822", "#3579aa", "#245b85", "#6ca5c7", "#f2c04d", "#c47a52", "#9b594a", "#29a9d6"), background: "sky-grid",
      backHair: `<g class="female-outline"><path d="M354 408 Q324 295 376 209 Q424 130 521 137 Q612 108 691 173 Q770 239 733 393 L693 441 L389 441 Z" fill="#d98d20"/><path d="M377 332 Q370 204 488 158 Q595 116 688 192 Q735 231 736 305 Q665 247 595 269 Q487 318 393 410 Z" fill="#efb638"/></g>`,
      frontHair: `<g class="female-outline"><path d="M365 347 Q353 227 461 168 Q554 115 666 164 Q728 194 749 260 Q680 236 626 265 Q575 302 516 292 Q446 286 387 384 Z" fill="#f4c54e"/><path d="M399 301 Q449 194 548 184 Q633 170 700 220 Q623 209 570 249 Q502 287 416 346 Z" fill="#ffd96b"/><path d="M512 290 Q568 254 620 267 Q673 272 716 249 Q679 304 621 320 Q563 327 512 290 Z" fill="#d9781d"/><path d="M414 276 Q466 197 539 196 M521 173 Q592 143 657 182 M594 231 Q656 207 705 237" fill="none" stroke="#fff0a0" stroke-width="10" opacity="0.66"/><path d="M388 336 Q439 299 501 294" fill="none" stroke="#c96b18" stroke-width="9" opacity="0.75"/></g>`,
      body: `<g class="female-outline"><path class="female-skin" d="M481 617 L599 617 L611 744 L469 744 Z"/><path d="M482 634 Q540 668 599 634 L604 686 Q540 719 476 686 Z" fill="var(--skin-shadow)" stroke="none" opacity="0.56"/><path class="female-hoodie" d="M286 1088 L313 838 Q334 772 447 741 L470 719 Q540 775 610 719 L634 741 Q747 772 768 838 L795 1088 Z"/><path d="M437 741 Q540 809 643 741" fill="none" stroke="var(--cloth-trim)" stroke-width="12"/><path d="M334 846 Q382 807 442 790 M746 846 Q698 807 638 790" fill="none" stroke="#8dc1dc" stroke-width="10" opacity="0.55"/><path d="M322 1040 Q540 1071 758 1040" fill="none" stroke="var(--cloth-shade)" stroke-width="18"/></g>`,
      facePath: "M540 250 C442 247 386 307 386 417 L398 511 C407 586 454 633 502 654 Q540 672 578 654 C626 633 673 586 682 511 L694 417 C694 307 638 247 540 250 Z",
      nosePath: "M530 444 C520 472 512 500 528 511 Q548 526 573 508 L562 491", features: features({
        ears: `<path class="female-skin" d="M391 416 Q344 397 330 441 Q319 484 344 521 Q364 546 397 524 Q382 479 391 416 Z"/><path class="female-skin" d="M689 416 Q736 397 750 441 Q761 484 736 521 Q716 546 683 524 Q698 479 689 416 Z"/><path d="M356 438 Q337 461 354 489 Q369 508 387 488 M724 438 Q743 461 726 489 Q711 508 693 488" fill="none" stroke="#a96549" stroke-width="6"/><path d="M350 450 Q363 440 379 449 M730 450 Q717 440 701 449" fill="none" stroke="#f5c49e" stroke-width="4"/>`,
        details: `<path d="M402 475 Q412 597 511 650 Q446 627 416 573 Q399 540 395 494 Z" fill="var(--skin-shadow)" opacity="0.2" stroke="none"/><path d="M650 316 Q681 365 682 427" fill="none" stroke="#ffd4ad" stroke-width="6" opacity="0.35"/><path d="M526 455 Q535 445 546 450" fill="none" stroke="#f8c39d" stroke-width="5" opacity="0.55"/><g fill="#9f6247" stroke="none" opacity="0.66"><circle cx="448" cy="526" r="3.2"/><circle cx="462" cy="531" r="2.6"/><circle cx="478" cy="526" r="2.9"/><circle cx="602" cy="526" r="2.8"/><circle cx="618" cy="531" r="2.6"/><circle cx="632" cy="525" r="3.2"/></g>`,
        cheeks: `<ellipse cx="438" cy="548" rx="31" ry="12" fill="#d77568" opacity="0.16" stroke="none"/><ellipse cx="642" cy="548" rx="31" ry="12" fill="#d77568" opacity="0.16" stroke="none"/>`,
        eyeLeft: `<path d="M407 428 Q457 355 520 419 Q466 493 407 428 Z" fill="#ffffff" stroke-width="6"/>`, eyeRight: `<path d="M560 419 Q623 355 673 428 Q614 493 560 419 Z" fill="#ffffff" stroke-width="6"/>`,
        pupilLeft: `<ellipse cx="466" cy="429" rx="36" ry="46" fill="var(--iris-color)" stroke="none"/><ellipse cx="468" cy="436" rx="20" ry="29" fill="#123b5a" stroke="none"/><ellipse cx="452" cy="410" rx="11" ry="14" fill="#ffffff" stroke="none"/><circle cx="479" cy="448" r="6" fill="#ffffff" stroke="none"/><circle cx="485" cy="416" r="3.5" fill="#c9f6ff" stroke="none"/>`, pupilRight: `<ellipse cx="614" cy="429" rx="36" ry="46" fill="var(--iris-color)" stroke="none"/><ellipse cx="612" cy="436" rx="20" ry="29" fill="#123b5a" stroke="none"/><ellipse cx="598" cy="410" rx="11" ry="14" fill="#ffffff" stroke="none"/><circle cx="625" cy="448" r="6" fill="#ffffff" stroke="none"/><circle cx="631" cy="416" r="3.5" fill="#c9f6ff" stroke="none"/>`,
        browLeft: `<path d="M407 348 Q463 309 522 341 Q525 352 519 361 Q462 338 411 368 Z" fill="#75462e" stroke-width="3"/>`, browRight: `<path d="M673 348 Q617 309 558 341 Q555 352 561 361 Q618 338 669 368 Z" fill="#75462e" stroke-width="3"/>`
      }),
      rig: rigMetrics({ shoulders: [[313, 758], [767, 758]], arms: [141, 148], gesture: [1.1, 1.04, 0, 9], head: [540, 433], eyes: [466, 427, 614, 427], eyeScale: [1.05, 0.98], brows: [466, 350, 614, 350], mouth: [540, 590, 0.7, 0.6], nose: [0, 0, 1, 1, 0, 544, 488], wearables: { glasses: [540, 427, 0.92], hat: [540, 230, 1.02, -2], earrings: [[356, 471], [724, 471], 0.92], neckwear: [540, 716, 1.02] }, handScale: 1.03 }),
      accessories: { earrings: "none", neckwear: "none" }
    }),
    profile({
      id: "clay", name: "Clay", gender: "neutral", kind: "mascot", outfit: "crewneck",
      description: "A soft clay figure with a tilted oval head, bead eyes, chunky orange hair masses and a rounded yellow sweatshirt.",
      source: "https://codepen.io/alvaromontoro/pen/ZEgezbN",
      palette: palette("#e99e78", "#ee9247", "#e8bd3f", "#ba8127", "#f6d973", "#f8e3b1", "#c97859", "#a95250", "#35323a"), background: "cream-grid",
      backHair: `<g class="female-outline female-hair"><ellipse cx="532" cy="309" rx="203" ry="170" /><ellipse cx="374" cy="394" rx="66" ry="137" /><ellipse cx="690" cy="361" rx="74" ry="128" /></g>`,
      frontHair: `<g class="female-outline female-hair"><path d="M364 358 Q385 190 546 181 Q694 182 728 330 Q650 274 586 294 Q489 339 390 433 Z" /><ellipse cx="623" cy="227" rx="74" ry="42" fill="#f6ac5d" /></g>`,
      body: `<g class="female-outline"><path class="female-skin" d="M501 598 L579 598 L579 681 Q540 705 501 681 Z" /><path class="female-hoodie" d="M407 718 Q449 665 500 665 Q540 704 580 665 Q631 665 673 718 Q718 846 712 1088 L368 1088 Q362 846 407 718 Z" /><path d="M454 694 Q540 753 626 694" fill="none" stroke="var(--cloth-trim)" stroke-width="16" /><ellipse cx="540" cy="908" rx="134" ry="94" fill="var(--cloth-shade)" opacity="0.25" /></g>`,
      facePath: "M510 231 C418 249 377 327 390 438 L406 526 C419 599 477 629 551 619 C626 609 677 563 682 490 L681 384 C674 278 602 214 510 231 Z",
      nosePath: "M526 496 Q542 516 558 494", features: features({
        ears: `<ellipse cx="386" cy="470" rx="35" ry="49" class="female-skin" /><ellipse cx="685" cy="446" rx="34" ry="48" class="female-skin" />`,
        cheeks: `<ellipse cx="438" cy="526" rx="31" ry="18" fill="#d86f62" opacity="0.24" stroke="none" /><ellipse cx="637" cy="507" rx="31" ry="18" fill="#d86f62" opacity="0.24" stroke="none" />`,
        eyeLeft: `<circle cx="463" cy="421" r="39" fill="#f9f1e5" stroke-width="7" />`, eyeRight: `<circle cx="617" cy="403" r="37" fill="#f9f1e5" stroke-width="7" />`,
        pupilLeft: `<circle cx="463" cy="426" r="15" fill="var(--iris-color)" stroke="none" /><circle cx="458" cy="420" r="5" fill="#ffffff" stroke="none" />`, pupilRight: `<circle cx="617" cy="408" r="14" fill="var(--iris-color)" stroke="none" /><circle cx="612" cy="402" r="5" fill="#ffffff" stroke="none" />`,
        browLeft: `<path d="M425 355 Q460 337 497 352" fill="none" stroke="var(--hair-color)" stroke-width="14" />`, browRight: `<path d="M582 340 Q618 326 651 345" fill="none" stroke="var(--hair-color)" stroke-width="14" />`
      }),
      rig: rigMetrics({ shoulders: [[407, 748], [673, 748]], arms: [116, 124], gesture: [0.86, 0.9, -2, 5], head: [540, 430], eyes: [463, 421, 617, 403], eyeScale: [0.84, 0.84], brows: [463, 353, 617, 338], mouth: [548, 558, 0.72, 0.7], nose: [0, 0, 0.83, 0.88, -4, 542, 500], wearables: { glasses: [540, 414, 0.84, -4], hat: [540, 222, 0.92, -3], earrings: [[387, 468], [685, 447], 0.82], neckwear: [540, 665, 0.84] }, handScale: 0.86 }),
      accessories: { earrings: "none", neckwear: "none" }
    }),
    profile({
      id: "homer", name: "Homer", gender: "male", kind: "cartoon", outfit: "tshirt",
      description: "An original safe SVG take on the supplied CSS Simpsons reference: bald dome, loop hairs, bulging eyes and tan muzzle.",
      source: "https://github.com/alvaromontoro/CSS-Simpsons",
      palette: palette("#fdd835", "#202020", "#ffffff", "#d4d9df", "#eef2f5", "#70d1fe", "#dfba2c", "#8d6248", "#171717"), background: "sky-grid",
      backHair: `<g class="female-outline"><path d="M397 349 Q392 197 504 167 Q629 133 682 241 Q715 310 684 405" fill="var(--skin-color)" /><path d="M456 183 Q421 130 474 119 Q516 122 523 169 M489 169 Q468 112 527 110 Q568 122 567 169" fill="none" stroke="var(--outline-color)" stroke-width="9" /></g>`,
      frontHair: `<g class="female-outline"><path d="M401 356 L377 335 L391 379 L368 369 L397 406" fill="none" stroke="var(--outline-color)" stroke-width="10" /></g>`,
      body: `<g class="female-outline"><path class="female-skin" d="M487 615 L607 615 L600 699 Q548 724 480 687 Z" /><path class="female-hoodie" d="M355 754 Q406 682 484 675 L548 716 L606 673 Q678 684 724 754 L770 1088 L310 1088 Z" /><path d="M482 674 L548 716 L507 767 L454 696 Z M606 673 L548 716 L589 767 L639 697 Z" fill="var(--cloth-trim)" /><path d="M548 716 L548 1088" fill="none" stroke="var(--cloth-shade)" stroke-width="7" /></g>`,
      facePath: "M493 179 C411 199 384 291 396 403 L406 496 C414 574 460 627 536 647 C612 647 682 603 690 524 L699 371 C704 255 617 150 493 179 Z",
      nosePath: "M598 423 C650 410 677 437 666 471 C657 497 622 500 595 487", features: features({
        ears: `<circle cx="397" cy="470" r="43" class="female-skin" /><circle cx="692" cy="455" r="39" class="female-skin" />`,
        details: `<path d="M450 497 Q540 449 642 483 Q690 526 646 604 Q590 657 503 622 Q455 591 450 497 Z" fill="#d3ae5d" stroke="var(--outline-color)" stroke-width="5" />`,
        cheeks: `<path d="M444 524 Q426 546 447 568" fill="none" stroke="#c39b51" stroke-width="7" />`,
        eyeLeft: `<circle cx="498" cy="396" r="62" fill="#ffffff" stroke-width="6" />`, eyeRight: `<circle cx="603" cy="389" r="59" fill="#ffffff" stroke-width="6" />`,
        pupilLeft: `<circle cx="508" cy="405" r="11" fill="#111111" stroke="none" />`, pupilRight: `<circle cx="596" cy="399" r="11" fill="#111111" stroke="none" />`,
        browLeft: `<path d="M449 329 Q487 309 520 326" fill="none" stroke="#222222" stroke-width="7" />`, browRight: `<path d="M572 318 Q612 304 640 329" fill="none" stroke="#222222" stroke-width="7" />`
      }),
      rig: rigMetrics({ shoulders: [[355, 762], [724, 762]], arms: [145, 151], gesture: [1.12, 1.06, 4, 12], head: [548, 424], eyes: [498, 396, 603, 389], eyeScale: [0.88, 0.9], brows: [498, 325, 603, 320], mouth: [558, 570, 0.72, 0.75], nose: [0, 0, 1, 1, 0, 620, 455], wearables: { glasses: [550, 393, 0.78, -2], hat: [536, 188, 0.84, -3], earrings: [[397, 470], [692, 455], 0.9], neckwear: [548, 680, 1.05] }, handScale: 1.05 }),
      accessories: { earrings: "none", neckwear: "none" }
    }),
    profile({
      id: "bart", name: "Bart", gender: "male", kind: "cartoon", outfit: "tshirt",
      description: "An original safe SVG take on the supplied CSS Simpsons reference with a tall flat head, nine spikes and a red tee.",
      source: "https://github.com/alvaromontoro/CSS-Simpsons",
      palette: palette("#fdd835", "#fdd835", "#f44336", "#bd3028", "#ff786e", "#1e88e5", "#dfba2c", "#8f563b", "#111111"), background: "white-grid",
      backHair: `<g class="female-outline"><path d="M407 332 L407 210 L432 224 L446 182 L474 207 L493 163 L521 197 L548 153 L574 195 L606 164 L623 207 L657 181 L663 225 L700 211 L690 357 Z" fill="var(--skin-color)" /></g>`,
      frontHair: `<g class="female-outline"><path d="M407 214 L432 224 L446 182 L474 207 L493 163 L521 197 L548 153 L574 195 L606 164 L623 207 L657 181 L663 225 L700 211" fill="none" stroke="var(--outline-color)" stroke-width="8" /></g>`,
      body: `<g class="female-outline"><path class="female-skin" d="M500 616 L593 616 L593 681 Q547 705 500 681 Z" /><path class="female-hoodie" d="M381 729 Q431 671 498 671 Q547 710 596 671 Q663 671 713 729 L752 1088 L342 1088 Z" /><path d="M409 829 Q547 858 685 829" fill="none" stroke="var(--cloth-shade)" stroke-width="9" /><path d="M361 1024 Q547 1055 733 1024 L741 1088 L353 1088 Z" fill="#1e88e5" /></g>`,
      facePath: "M407 209 L690 209 L690 484 C690 584 629 635 545 635 C461 635 407 584 407 484 Z",
      nosePath: "M438 471 Q395 476 403 510 Q413 540 458 521", features: features({
        ears: `<circle cx="697" cy="474" r="42" class="female-skin" /><circle cx="401" cy="474" r="35" class="female-skin" />`,
        cheeks: `<path d="M434 541 Q470 565 502 548 M594 548 Q631 564 665 541" fill="none" stroke="#d8ad2a" stroke-width="8" opacity="0.55" />`,
        eyeLeft: `<circle cx="476" cy="414" r="65" fill="#ffffff" stroke-width="6" />`, eyeRight: `<circle cx="586" cy="410" r="68" fill="#ffffff" stroke-width="6" />`,
        pupilLeft: `<circle cx="486" cy="423" r="12" fill="#111111" stroke="none" />`, pupilRight: `<circle cx="575" cy="421" r="12" fill="#111111" stroke="none" />`,
        browLeft: `<path d="M427 337 Q469 319 503 338" fill="none" stroke="#2b2925" stroke-width="8" />`, browRight: `<path d="M548 334 Q592 313 629 338" fill="none" stroke="#2b2925" stroke-width="8" />`
      }),
      rig: rigMetrics({ shoulders: [[381, 748], [713, 748]], arms: [129, 135], gesture: [1.02, 0.98, 3, 0], head: [547, 430], eyes: [476, 414, 586, 410], eyeScale: [0.92, 0.96], brows: [476, 335, 586, 333], mouth: [548, 574, 0.76, 0.72], nose: [0, 0, 0.9, 0.9, 0, 430, 500], wearables: { glasses: [532, 411, 0.83], hat: [548, 212, 0.84], earrings: [[401, 474], [697, 474], 0.86], neckwear: [547, 671, 0.96] }, handScale: 0.94 }),
      accessories: { earrings: "none", neckwear: "chain" }
    }),
    profile({
      id: "king", name: "King", gender: "male", kind: "cartoon", outfit: "royal",
      description: "A broad elderly king with drooping jewel-blue eyes, a three-point crown and a jagged white beard over royal blue.",
      source: "https://codepen.io/alvaromontoro/pen/qErPJwr",
      palette: palette("#e8b29a", "#eee9df", "#355e9a", "#223f70", "#e7bd42", "#dd2244", "#c88870", "#aa5e57", "#3f6691"), background: "night-grid",
      backHair: `<g class="female-outline"><path d="M366 349 Q373 219 475 190 Q540 157 612 188 Q710 222 718 352 L690 522 L390 522 Z" fill="#eee9df" /><path d="M386 251 L418 137 L487 214 L540 103 L595 214 L664 137 L696 252 Z" fill="#e7bd42" stroke="var(--outline-color)" /><circle cx="540" cy="176" r="18" fill="#dd2244" /></g>`,
      frontHair: `<g class="female-outline"><path d="M383 321 Q432 213 540 217 Q648 213 697 321 Q633 282 540 292 Q447 282 383 321 Z" fill="#eee9df" /></g>`,
      body: `<g class="female-outline"><path class="female-skin" d="M478 608 L602 608 L602 684 Q540 712 478 684 Z" /><path class="female-hoodie" d="M351 740 Q404 673 480 670 L540 711 L600 670 Q676 673 729 740 L775 1088 L305 1088 Z" /><path d="M420 690 L360 791 L413 839 L477 712 Z M660 690 L720 791 L667 839 L603 712 Z" fill="#d32f45" /><path d="M514 709 L540 744 L566 709 L587 1088 L493 1088 Z" fill="var(--cloth-trim)" /><circle cx="540" cy="822" r="10" fill="#dd2244" /><circle cx="540" cy="921" r="10" fill="#dd2244" /></g>`,
      facePath: "M540 238 C433 235 379 304 383 417 L395 516 C405 591 459 628 540 631 C621 628 675 591 685 516 L697 417 C701 304 647 235 540 238 Z",
      nosePath: "M527 469 L515 518 Q540 539 565 518 L553 469", features: features({
        ears: `<ellipse cx="378" cy="468" rx="38" ry="59" class="female-skin" /><ellipse cx="702" cy="468" rx="38" ry="59" class="female-skin" />`,
        details: `<path d="M402 507 Q540 472 678 507 L666 578 Q637 655 540 682 Q443 655 414 578 Z" fill="#eee9df" stroke="var(--outline-color)" stroke-width="5" /><path d="M457 528 Q501 499 540 534 Q579 499 623 528 Q590 560 540 547 Q490 560 457 528 Z" fill="#ffffff" stroke="var(--outline-color)" stroke-width="4" />`,
        cheeks: `<ellipse cx="426" cy="512" rx="24" ry="13" fill="#ce7770" opacity="0.22" stroke="none" /><ellipse cx="654" cy="512" rx="24" ry="13" fill="#ce7770" opacity="0.22" stroke="none" />`,
        eyeLeft: `<path d="M408 410 Q453 370 502 405 Q459 448 408 410 Z" fill="#ffffff" stroke-width="5" />`, eyeRight: `<path d="M578 405 Q627 370 672 410 Q621 448 578 405 Z" fill="#ffffff" stroke-width="5" />`,
        pupilLeft: `<ellipse cx="457" cy="411" rx="17" ry="23" fill="var(--iris-color)" stroke="none" />`, pupilRight: `<ellipse cx="623" cy="411" rx="17" ry="23" fill="var(--iris-color)" stroke="none" />`,
        browLeft: `<path d="M405 354 Q452 321 508 349" fill="none" stroke="#eee9df" stroke-width="20" />`, browRight: `<path d="M572 349 Q628 321 675 354" fill="none" stroke="#eee9df" stroke-width="20" />`
      }),
      rig: rigMetrics({ shoulders: [[351, 754], [729, 754]], arms: [148, 154], gesture: [1.16, 1.06, 0, 8], head: [540, 444], eyes: [457, 408, 623, 408], eyeScale: [1.02, 0.76], brows: [457, 350, 623, 350], mouth: [540, 585, 0.75, 0.7], nose: [0, 0, 1.02, 0.98, 0, 540, 500], wearables: { glasses: [540, 408, 0.9], hat: [540, 200, 0.9], earrings: [[378, 472], [702, 472], 1], neckwear: [540, 680, 1.06] }, handScale: 1.06 }),
      accessories: { earrings: "none", neckwear: "chain" }
    }),
    profile({
      id: "guard", name: "Guard", gender: "male", kind: "cartoon", outfit: "armor",
      description: "A narrow castle guard with slit eyes, a conical steel helmet, squared beard and plated red armor.",
      source: "https://codepen.io/alvaromontoro/pen/qErPJwr",
      palette: palette("#dfa58c", "#76502f", "#a73b3d", "#6f262b", "#c8cbd0", "#d5b256", "#bd7d68", "#9d5452", "#39404a"), background: "night-grid",
      backHair: `<g class="female-outline"><path d="M397 305 L468 139 Q540 91 612 139 L683 305 Z" fill="#bfc3c8" /><path d="M405 300 H675 L691 350 H389 Z" fill="#90969e" /></g>`,
      frontHair: `<g class="female-outline female-hair"><path d="M400 339 Q420 262 540 250 Q660 262 680 339 L656 388 L424 388 Z" /><path d="M540 112 V306" fill="none" stroke="#e4e7ea" stroke-width="15" /></g>`,
      body: `<g class="female-outline"><path class="female-skin" d="M489 600 L591 600 L591 678 Q540 703 489 678 Z" /><path class="female-hoodie" d="M372 724 Q419 668 487 666 Q540 706 593 666 Q661 668 708 724 L752 1088 L328 1088 Z" /><path d="M382 744 H698 L680 933 H400 Z" fill="#c8cbd0" /><path d="M408 766 H672 M402 822 H678 M397 878 H683" fill="none" stroke="#8f969d" stroke-width="10" /><path d="M373 944 H707 V1000 H373 Z" fill="#4a3425" /></g>`,
      facePath: "M540 267 C451 267 409 318 412 421 L421 521 C428 589 475 621 540 624 C605 621 652 589 659 521 L668 421 C671 318 629 267 540 267 Z",
      nosePath: "M531 462 L522 514 Q540 526 558 514 L549 462", features: features({
        ears: `<rect x="392" y="439" width="42" height="78" rx="18" class="female-skin" /><rect x="646" y="439" width="42" height="78" rx="18" class="female-skin" />`,
        details: `<path d="M421 500 Q540 476 659 500 L652 584 Q609 636 540 644 Q471 636 428 584 Z" fill="var(--hair-color)" stroke="var(--outline-color)" stroke-width="5" /><path d="M468 530 Q505 509 540 536 Q575 509 612 530 Q583 552 540 546 Q497 552 468 530 Z" fill="#654123" stroke="var(--outline-color)" stroke-width="4" />`,
        cheeks: `<path d="M437 506 H466 M614 506 H643" stroke="#b87362" stroke-width="9" opacity="0.25" />`,
        eyeLeft: `<rect x="438" y="400" width="75" height="34" rx="14" fill="#f8f3e9" stroke-width="5" />`, eyeRight: `<rect x="567" y="400" width="75" height="34" rx="14" fill="#f8f3e9" stroke-width="5" />`,
        pupilLeft: `<rect x="473" y="407" width="12" height="20" rx="6" fill="#222222" stroke="none" />`, pupilRight: `<rect x="595" y="407" width="12" height="20" rx="6" fill="#222222" stroke="none" />`,
        browLeft: `<rect x="432" y="363" width="84" height="14" rx="3" />`, browRight: `<rect x="564" y="363" width="84" height="14" rx="3" />`
      }),
      rig: rigMetrics({ shoulders: [[372, 744], [708, 744]], arms: [135, 141], gesture: [1.04, 0.96, 0, -3], head: [540, 446], eyes: [476, 417, 604, 417], eyeScale: [0.92, 0.62], brows: [476, 370, 604, 370], mouth: [540, 566, 0.67, 0.68], nose: [0, 0, 0.82, 0.94, 0, 540, 500], wearables: { glasses: [540, 417, 0.72], hat: [540, 249, 0.82], earrings: [[412, 476], [668, 476], 0.8], neckwear: [540, 666, 0.92] }, handScale: 0.96 }),
      accessories: { earrings: "none", neckwear: "none" }
    }),
    profile({
      id: "inquisitor", name: "Inquisitor", gender: "male", kind: "cartoon", outfit: "cloak",
      description: "A severe long-faced inquisitor with hooded eyes, a red angular cowl, black bob and tall split-brim hat.",
      source: "https://codepen.io/alvaromontoro/pen/qErPJwr",
      palette: palette("#efc0a9", "#17151c", "#9f1e2f", "#61101f", "#d8a23b", "#e9c45b", "#cd927b", "#9f5555", "#302938"), background: "night-grid",
      backHair: `<g class="female-outline female-hair"><path d="M393 270 Q540 157 687 270 L718 596 Q668 650 625 607 L455 607 Q412 650 362 596 Z" /><path d="M328 267 Q540 126 752 267 L704 319 H376 Z" fill="#8f1c2d" /><path d="M404 260 L472 103 H608 L676 260 Z" fill="#a92335" /></g>`,
      frontHair: `<g class="female-outline female-hair"><path d="M389 345 Q408 218 536 222 Q675 218 696 344 L651 308 Q593 286 540 319 Q478 282 429 317 Z" /></g>`,
      body: `<g class="female-outline"><path class="female-skin" d="M500 608 L580 608 L580 680 Q540 703 500 680 Z" /><path class="female-hoodie" d="M359 728 Q420 668 496 668 L540 704 L584 668 Q660 668 721 728 L788 1088 L292 1088 Z" /><path d="M359 728 L480 666 L540 724 L600 666 L721 728 L665 846 L540 783 L415 846 Z" fill="var(--cloth-shade)" /><path d="M540 783 V1088" fill="none" stroke="var(--cloth-trim)" stroke-width="8" /></g>`,
      facePath: "M540 237 C456 237 410 295 410 402 L424 526 C433 605 480 647 540 658 C600 647 647 605 656 526 L670 402 C670 295 624 237 540 237 Z",
      nosePath: "M540 431 L515 521 Q540 540 565 521", features: features({
        ears: `<path class="female-skin" d="M411 448 Q378 434 383 476 Q389 515 427 507 M669 448 Q702 434 697 476 Q691 515 653 507" />`,
        details: `<path d="M456 523 Q540 497 624 523 Q604 557 540 548 Q476 557 456 523 Z" fill="#17151c" stroke="var(--outline-color)" stroke-width="4" />`,
        cheeks: `<path d="M438 531 L469 540 M611 540 L642 531" stroke="#b56e66" stroke-width="7" opacity="0.22" />`,
        eyeLeft: `<path d="M432 410 Q474 371 518 401 Q482 438 432 410 Z" fill="#fbf7f0" stroke-width="5" />`, eyeRight: `<path d="M562 401 Q606 371 648 410 Q598 438 562 401 Z" fill="#fbf7f0" stroke-width="5" />`,
        pupilLeft: `<ellipse cx="478" cy="407" rx="13" ry="20" fill="var(--iris-color)" stroke="none" />`, pupilRight: `<ellipse cx="602" cy="407" rx="13" ry="20" fill="var(--iris-color)" stroke="none" />`,
        browLeft: `<path d="M428 360 L513 379" fill="none" stroke="var(--hair-color)" stroke-width="17" />`, browRight: `<path d="M567 379 L652 360" fill="none" stroke="var(--hair-color)" stroke-width="17" />`
      }),
      rig: rigMetrics({ shoulders: [[359, 750], [721, 750]], arms: [139, 147], gesture: [1.08, 1.04, 0, 6], head: [540, 445], eyes: [478, 405, 602, 405], eyeScale: [0.96, 0.7], brows: [478, 372, 602, 372], mouth: [540, 588, 0.66, 0.75], nose: [0, 0, 1, 1.06, 0, 540, 500], wearables: { glasses: [540, 405, 0.82], hat: [540, 245, 1.07], earrings: [[410, 474], [670, 474], 0.83], neckwear: [540, 674, 0.98] }, handScale: 0.98 }),
      accessories: { earrings: "none", neckwear: "chain" }
    }),
    profile({
      id: "heart", name: "Heart", gender: "neutral", kind: "mascot", outfit: "tshirt",
      description: "A bright heart-shaped mascot with separated lobes, enormous glossy eyes, tiny side nubs and a tapered body.",
      source: "https://codepen.io/alvaromontoro/pen/QwEEOPx",
      palette: palette("#ef4965", "#b51f45", "#f26b7f", "#bf304e", "#ff9cab", "#ffe1e7", "#c62e4d", "#8f2441", "#592d66"), background: "white-grid",
      backHair: `<g class="female-outline"><path d="M540 663 C483 603 361 516 352 381 C344 262 477 215 540 318 C603 215 736 262 728 381 C719 516 597 603 540 663 Z" fill="#c62e4d" /></g>`,
      frontHair: `<g class="female-outline"><path d="M540 329 Q489 229 405 268 Q341 299 369 397" fill="none" stroke="#ff8297" stroke-width="18" /><path d="M540 329 Q591 229 675 268 Q739 299 711 397" fill="none" stroke="#d72f52" stroke-width="18" /></g>`,
      body: `<g class="female-outline"><path class="female-hoodie" d="M409 690 Q473 650 540 697 Q607 650 671 690 L724 1088 L356 1088 Z" /><path d="M425 737 Q540 797 655 737 L674 1088 L406 1088 Z" fill="var(--cloth-shade)" /><circle cx="540" cy="879" r="86" fill="#ff9cab" opacity="0.28" /></g>`,
      facePath: "M540 650 C482 592 374 510 365 386 C357 280 477 238 540 337 C603 238 723 280 715 386 C706 510 598 592 540 650 Z",
      nosePath: "M531 509 Q540 516 549 509", features: features({
        ears: `<circle cx="362" cy="456" r="26" fill="var(--skin-color)" /><circle cx="718" cy="456" r="26" fill="var(--skin-color)" />`,
        cheeks: `<ellipse cx="425" cy="523" rx="40" ry="20" fill="#ffb0bb" opacity="0.6" stroke="none" /><ellipse cx="655" cy="523" rx="40" ry="20" fill="#ffb0bb" opacity="0.6" stroke="none" />`,
        eyeLeft: `<ellipse cx="458" cy="438" rx="56" ry="72" fill="#fff9fb" stroke-width="6" />`, eyeRight: `<ellipse cx="622" cy="438" rx="56" ry="72" fill="#fff9fb" stroke-width="6" />`,
        pupilLeft: `<ellipse cx="458" cy="447" rx="29" ry="40" fill="var(--iris-color)" stroke="none" /><circle cx="446" cy="428" r="12" fill="#ffffff" stroke="none" /><circle cx="469" cy="462" r="6" fill="#ffffff" stroke="none" />`, pupilRight: `<ellipse cx="622" cy="447" rx="29" ry="40" fill="var(--iris-color)" stroke="none" /><circle cx="610" cy="428" r="12" fill="#ffffff" stroke="none" /><circle cx="633" cy="462" r="6" fill="#ffffff" stroke="none" />`,
        browLeft: `<path d="M410 348 Q456 321 501 348" fill="none" stroke="#b51f45" stroke-width="12" />`, browRight: `<path d="M579 348 Q624 321 670 348" fill="none" stroke="#b51f45" stroke-width="12" />`
      }),
      rig: rigMetrics({ shoulders: [[409, 724], [671, 724]], arms: [108, 116], gesture: [0.82, 0.84, 0, -8], head: [540, 448], eyes: [458, 438, 622, 438], eyeScale: [1.06, 1.08], brows: [458, 348, 622, 348], mouth: [540, 562, 0.72, 0.66], nose: [0, 0, 0.62, 0.62, 0, 540, 510], wearables: { glasses: [540, 438, 0.84], hat: [540, 273, 0.76], earrings: [[362, 456], [718, 456], 0.8], neckwear: [540, 672, 0.84] }, handScale: 0.82 }),
      accessories: { earrings: "studs", neckwear: "none" }
    }),
    profile({
      id: "mouse", name: "Mouse", gender: "neutral", kind: "mascot", outfit: "sweater",
      description: "A silver mouse mascot with satellite ears, close bead eyes, a pointed muzzle, whiskers and a compact knit torso.",
      source: "https://codepen.io/alvaromontoro/pen/MYaoEBX",
      palette: palette("#aeb5bf", "#747d89", "#6d8fa4", "#46697d", "#a9c3d0", "#f1a5b0", "#8b929d", "#9d5863", "#202630"), background: "sky-grid",
      backHair: `<g class="female-outline"><circle cx="364" cy="303" r="112" fill="#8f98a4" /><circle cx="716" cy="303" r="112" fill="#8f98a4" /><circle cx="364" cy="303" r="68" fill="#e4a3ae" /><circle cx="716" cy="303" r="68" fill="#e4a3ae" /></g>`,
      frontHair: `<g class="female-outline"><path d="M444 284 Q540 224 636 284" fill="none" stroke="#7a838e" stroke-width="28" /></g>`,
      body: `<g class="female-outline"><path class="female-skin" d="M505 609 L575 609 L575 674 Q540 695 505 674 Z" /><path class="female-hoodie" d="M414 710 Q454 667 504 665 Q540 697 576 665 Q626 667 666 710 L704 1088 L376 1088 Z" /><path d="M405 808 H675 M397 880 H683 M389 952 H691" fill="none" stroke="var(--cloth-trim)" stroke-width="7" opacity="0.65" /><path d="M430 1027 Q540 1050 650 1027" fill="none" stroke="var(--cloth-shade)" stroke-width="17" /></g>`,
      facePath: "M540 261 C435 261 383 326 393 435 L410 520 C425 586 477 621 540 637 C603 621 655 586 670 520 L687 435 C697 326 645 261 540 261 Z",
      nosePath: "M526 511 Q540 530 554 511", features: features({
        ears: `<path d="M394 390 Q354 404 371 449 M686 390 Q726 404 709 449" fill="none" stroke="#8b929d" stroke-width="10" />`,
        details: `<path d="M488 503 Q540 466 592 503 L570 548 Q540 566 510 548 Z" fill="#c7ccd3" stroke="none" /><ellipse cx="540" cy="514" rx="18" ry="13" fill="#ef91a2" stroke="var(--outline-color)" stroke-width="4" /><path d="M493 526 L376 506 M496 543 L370 550 M587 526 L704 506 M584 543 L710 550" fill="none" stroke="var(--outline-color)" stroke-width="4" />`,
        cheeks: `<circle cx="444" cy="524" r="20" fill="#f0a1ae" opacity="0.3" stroke="none" /><circle cx="636" cy="524" r="20" fill="#f0a1ae" opacity="0.3" stroke="none" />`,
        eyeLeft: `<ellipse cx="475" cy="420" rx="38" ry="47" fill="#f7f7f4" stroke-width="5" />`, eyeRight: `<ellipse cx="605" cy="420" rx="38" ry="47" fill="#f7f7f4" stroke-width="5" />`,
        pupilLeft: `<circle cx="475" cy="425" r="16" fill="#202630" stroke="none" /><circle cx="469" cy="419" r="5" fill="#ffffff" stroke="none" />`, pupilRight: `<circle cx="605" cy="425" r="16" fill="#202630" stroke="none" /><circle cx="599" cy="419" r="5" fill="#ffffff" stroke="none" />`,
        browLeft: `<path d="M441 363 Q475 346 509 362" fill="none" stroke="#747d89" stroke-width="10" />`, browRight: `<path d="M571 362 Q605 346 639 363" fill="none" stroke="#747d89" stroke-width="10" />`
      }),
      rig: rigMetrics({ shoulders: [[414, 738], [666, 738]], arms: [111, 121], gesture: [0.8, 0.88, 0, -2], head: [540, 446], eyes: [475, 420, 605, 420], eyeScale: [0.83, 0.9], brows: [475, 361, 605, 361], mouth: [540, 574, 0.62, 0.64], nose: [0, 0, 0.75, 0.76, 0, 540, 510], wearables: { glasses: [540, 420, 0.68], hat: [540, 258, 0.78], earrings: [[394, 456], [686, 456], 0.74], neckwear: [540, 666, 0.8] }, handScale: 0.8 }),
      accessories: { earrings: "none", neckwear: "none" }
    }),
    profile({
      id: "kawaii-cat", name: "Kawaii Cat", gender: "neutral", kind: "mascot", outfit: "hoodie",
      description: "A cream kawaii cat with tall triangular ears, violet starry eyes, forehead stripes, side whiskers and paw-like shoulders.",
      source: "https://codepen.io/alvaromontoro/pen/zxvxbBv",
      palette: palette("#f3d8b5", "#c48962", "#8b72c6", "#624e9e", "#c9b9ee", "#ef9fa8", "#d3ae87", "#ae626b", "#7658a6"), background: "cream-grid",
      backHair: `<g class="female-outline"><path d="M386 370 L397 174 L492 268 Q540 246 588 268 L683 174 L694 370 Z" fill="var(--skin-color)" /><path d="M412 232 L425 304 L471 278 Z M668 232 L655 304 L609 278 Z" fill="#eaa4aa" /></g>`,
      frontHair: `<g class="female-outline"><path d="M492 273 L513 334 M540 259 V330 M588 273 L567 334" fill="none" stroke="#c48962" stroke-width="15" /></g>`,
      body: `<g class="female-outline"><path class="female-skin" d="M503 605 L577 605 L577 672 Q540 695 503 672 Z" /><path class="female-hoodie" d="M399 707 Q448 660 502 664 Q540 700 578 664 Q632 660 681 707 L725 1088 L355 1088 Z" /><path d="M465 665 Q540 731 615 665 L636 710 Q540 773 444 710 Z" fill="var(--cloth-trim)" /><path d="M475 748 L463 839 M605 748 L617 839" fill="none" stroke="var(--cloth-shade)" stroke-width="7" /><path d="M435 913 Q540 947 645 913 L663 1019 Q540 1047 417 1019 Z" fill="var(--cloth-shade)" /></g>`,
      facePath: "M540 263 C435 263 380 324 386 427 L399 515 C410 589 468 625 540 629 C612 625 670 589 681 515 L694 427 C700 324 645 263 540 263 Z",
      nosePath: "M526 506 Q540 519 554 506", features: features({
        ears: `<path d="M394 410 Q365 432 389 474 M686 410 Q715 432 691 474" fill="none" stroke="#d3ae87" stroke-width="9" />`,
        details: `<path d="M540 500 L523 518 L540 531 L557 518 Z" fill="#cf7f88" stroke="var(--outline-color)" stroke-width="4" /><path d="M540 531 Q518 552 498 535 M540 531 Q562 552 582 535 M489 515 L375 493 M492 535 L371 544 M591 515 L705 493 M588 535 L709 544" fill="none" stroke="var(--outline-color)" stroke-width="4" />`,
        cheeks: `<ellipse cx="435" cy="526" rx="34" ry="17" fill="#ef9fa8" opacity="0.35" stroke="none" /><ellipse cx="645" cy="526" rx="34" ry="17" fill="#ef9fa8" opacity="0.35" stroke="none" />`,
        eyeLeft: `<path d="M415 423 Q463 365 511 423 Q463 482 415 423 Z" fill="#fffdf9" stroke-width="5" />`, eyeRight: `<path d="M569 423 Q617 365 665 423 Q617 482 569 423 Z" fill="#fffdf9" stroke-width="5" />`,
        pupilLeft: `<ellipse cx="463" cy="428" rx="27" ry="40" fill="var(--iris-color)" stroke="none" /><circle cx="453" cy="412" r="10" fill="#ffffff" stroke="none" /><circle cx="474" cy="444" r="5" fill="#ffffff" stroke="none" />`, pupilRight: `<ellipse cx="617" cy="428" rx="27" ry="40" fill="var(--iris-color)" stroke="none" /><circle cx="607" cy="412" r="10" fill="#ffffff" stroke="none" /><circle cx="628" cy="444" r="5" fill="#ffffff" stroke="none" />`,
        browLeft: `<path d="M419 350 Q462 326 505 350" fill="none" stroke="#c48962" stroke-width="11" />`, browRight: `<path d="M575 350 Q618 326 661 350" fill="none" stroke="#c48962" stroke-width="11" />`
      }),
      rig: rigMetrics({ shoulders: [[399, 746], [681, 746]], arms: [119, 126], gesture: [0.88, 0.91, 0, 1], head: [540, 444], eyes: [463, 423, 617, 423], eyeScale: [0.98, 1.04], brows: [463, 350, 617, 350], mouth: [540, 574, 0.66, 0.65], nose: [0, 0, 0.72, 0.7, 0, 540, 510], wearables: { glasses: [540, 423, 0.78], hat: [540, 282, 0.8], earrings: [[394, 471], [686, 471], 0.8], neckwear: [540, 664, 0.85] }, handScale: 0.84 }),
      accessories: { earrings: "drops", neckwear: "none" }
    }),
    profile({
      id: "neo", name: "Neo", gender: "male", kind: "cartoon", outfit: "hoodie",
      description: "A sharp blue presenter with swept electric hair, clean jawline and modern minimal aesthetic.",
      source: "https://codepen.io/alvaromontoro/pen/new-profile-neo",
      palette: palette("#a0c4ff", "#3a5a9a", "#3d5af1", "#2a3a6b", "#b8d4ff", "#ffd700", "#8a2be2", "#4a148c", "#1a237e"), background: "sky-grid",
      backHair: `<g class="female-outline female-hair"><path d="M540 177 C446 184 375 241 354 327 C346 360 345 404 357 447 L376 472 L386 369 Q415 272 540 265 Q665 272 694 369 L704 472 L723 447 C735 404 734 360 726 327 C705 241 634 184 540 201 Z" fill="#3d5af1" /></g>`,
      frontHair: `<g class="female-outline female-hair"><path d="M371 433 L359 354 C347 310 358 280 375 256 L365 232 Q398 193 444 192 C445 167 470 146 509 150 Q544 150 568 177 C594 160 626 171 642 194 C687 189 728 227 730 278 Q739 321 719 372 L708 432 L694 408 L691 357 Q679 315 658 287 C629 304 596 294 563 283 Q524 299 487 286 Q459 292 435 280 C409 302 400 335 392 367 L384 427 Z" fill="#3a5a9a" /></g>`,
      body: `<g class="female-outline"><path class="female-hoodie" d="M410 694 C376 684 386 648 411 628 C440 603 476 606 494 614 L586 614 C604 606 640 603 669 628 C694 648 704 684 670 694 L642 733 L438 733 Z" fill="#3d5af1" /><path class="female-skin" d="M494 582 L586 582 L586 669 Q540 703 494 669 Z" /></g>`,
      facePath: "M540 248 C450 242 397 298 379 375 L368 469 C365 512 371 555 391 582 C409 606 436 619 478 624 L602 624 C644 619 671 606 689 582 C709 555 715 512 712 469 L701 375 C683 298 630 242 540 248 Z",
      nosePath: "M523 511 Q540 541 557 511",
      features: {
        details: "",
        ears: `<circle cx="365" cy="486" r="26" fill="var(--skin-color)" /><circle cx="715" cy="486" r="26" fill="var(--skin-color)" />`,
        cheeks: `<ellipse cx="430" cy="530" rx="34" ry="18" fill="#ffd700" opacity="0.4" stroke="none" /><ellipse cx="650" cy="530" rx="34" ry="18" fill="#ffd700" opacity="0.4" stroke="none" />`,
        eyeLeft: `<ellipse cx="465" cy="423" rx="44" ry="56" fill="#ffffff" stroke-width="5" />`, eyeRight: `<ellipse cx="615" cy="423" rx="44" ry="56" fill="#ffffff" stroke-width="5" />`,
        pupilLeft: `<circle cx="465" cy="423" r="20" fill="var(--iris-color)" stroke="none" /><circle cx="460" cy="418" r="6" fill="#ffffff" stroke="none" />`, pupilRight: `<circle cx="615" cy="423" r="20" fill="var(--iris-color)" stroke="none" /><circle cx="610" cy="418" r="6" fill="#ffffff" stroke="none" />`,
        browLeft: `<path d="M415 350 Q456 321 498 350" fill="none" stroke="#4a148c" stroke-width="10" />`, browRight: `<path d="M582 350 Q624 321 665 350" fill="none" stroke="#4a148c" stroke-width="10" />`
      },
      rig: rigMetrics({ shoulders: [[402, 746], [678, 746]], arms: [120, 128], gesture: [0.85, 0.89, 0, 1], head: [540, 444], eyes: [465, 423, 615, 423], eyeScale: [0.95, 1.0], brows: [465, 350, 615, 350], mouth: [540, 574, 0.68, 0.65], nose: [0, 0, 0.7, 0.7, 0, 540, 510], wearables: { glasses: [540, 423, 0.8], hat: [540, 282, 0.8], earrings: [[394, 471], [686, 471], 0.8], neckwear: [540, 664, 0.85] }, handScale: 0.84 }),
      accessories: { earrings: "none", neckwear: "none" }
    }),
    profile({
      id: "luna", name: "Luna", gender: "female", kind: "human", outfit: "crewneck",
      description: "A soft pink presenter with side-swept hair, gentle features and a pastel crewneck aesthetic.",
      source: "https://codepen.io/alvaromontoro/pen/new-profile-luna",
      palette: palette("#fbcfe8", "#be185d", "#ec4899", "#9d174d", "#f9a8d4", "#ffd700", "#f472b6", "#881337", "#fce7f3"), background: "cream-grid",
      backHair: `<g class="female-outline female-hair"><path d="M540 177 C498 148 441 148 390 173 C315 209 286 282 278 361 L265 473 C307 475 350 451 373 417 C396 382 406 325 434 290 C464 252 506 242 540 246 Z" fill="#ec4899" /></g>`,
      frontHair: `<g class="female-outline female-hair"><path d="M540 177 C582 148 639 148 690 173 C765 209 794 282 802 361 L815 473 C773 475 730 451 707 417 C684 382 674 325 646 290 C616 252 574 242 540 246 Z" fill="#be185d" /></g>`,
      body: `<g class="female-outline"><path class="female-hoodie" d="M485 659 C449 657 407 690 378 750 L357 830 L339 1088 L741 1088 L723 830 L702 750 C673 690 631 657 595 659 Q540 710 485 659 Z" fill="#ec4899" /><path class="female-skin" d="M486 582 L594 582 L594 669 Q540 696 486 669 Z" /></g>`,
      facePath: "M540 250 C454 246 402 296 385 366 L369 461 C366 504 376 546 398 580 L437 614 Q450 626 477 626 L603 626 Q630 626 643 614 L682 580 C704 546 714 504 711 461 L695 366 C678 296 626 246 540 250 Z",
      nosePath: "M534 492 L524 514 Q540 528 556 513",
      features: {
        details: "",
        ears: `<circle cx="370" cy="486" r="26" fill="var(--skin-color)" /><circle cx="710" cy="486" r="26" fill="var(--skin-color)" />`,
        cheeks: `<ellipse cx="430" cy="525" rx="36" ry="20" fill="#f472b6" opacity="0.45" stroke="none" /><ellipse cx="650" cy="525" rx="36" ry="20" fill="#f472b6" opacity="0.45" stroke="none" />`,
        eyeLeft: `<ellipse cx="455" cy="423" rx="40" ry="50" fill="#ffffff" stroke-width="5" />`, eyeRight: `<ellipse cx="625" cy="423" rx="40" ry="50" fill="#ffffff" stroke-width="5" />`,
        pupilLeft: `<circle cx="455" cy="423" r="18" fill="var(--iris-color)" stroke="none" /><circle cx="450" cy="418" r="6" fill="#ffffff" stroke="none" />`, pupilRight: `<circle cx="625" cy="423" r="18" fill="var(--iris-color)" stroke="none" /><circle cx="620" cy="418" r="6" fill="#ffffff" stroke="none" />`,
        browLeft: `<path d="M410 348 Q450 318 490 348" fill="none" stroke="#881337" stroke-width="10" />`, browRight: `<path d="M590 348 Q630 318 670 348" fill="none" stroke="#881337" stroke-width="10" />`
      },
      rig: rigMetrics({ shoulders: [[385, 742], [695, 742]], arms: [125, 132], gesture: [0.87, 0.92, 0, 0], head: [540, 444], eyes: [455, 423, 625, 423], eyeScale: [1.0, 1.02], brows: [455, 348, 625, 348], mouth: [540, 572, 0.66, 0.64], nose: [0, 0, 0.72, 0.72, 0, 540, 510], wearables: { glasses: [540, 423, 0.82], hat: [540, 280, 0.82], earrings: [[390, 470], [690, 470], 0.82], neckwear: [540, 662, 0.84] }, handScale: 0.86 }),
      accessories: { earrings: "studs", neckwear: "none" }
    }),
    profile({
      id: "koda", name: "Koda", gender: "neutral", kind: "mascot", outfit: "tshirt",
      description: "A warm orange mascot with round capsule ears, big curious eyes and a cozy oversized t-shirt silhouette.",
      source: "https://codepen.io/alvaromontoro/pen/new-profile-koda",
      palette: palette("#fdba74", "#ea580c", "#f97316", "#c2410c", "#fed7aa", "#ffd700", "#fb923c", "#7c2d12", "#fff7ed"), background: "white-grid",
      backHair: `<g class="female-outline"><path d="M386 370 L397 174 L492 268 Q540 246 588 268 L683 174 L694 370 Z" fill="var(--skin-color)" /><path d="M412 232 L425 304 L471 278 Z M668 232 L655 304 L609 278 Z" fill="#f97316" /></g>`,
      frontHair: `<g class="female-outline"><path d="M444 284 Q540 224 636 284" fill="none" stroke="#ea580c" stroke-width="26" /></g>`,
      body: `<g class="female-outline"><path class="female-skin" d="M492 594 L588 594 L588 675 Q540 703 492 675 Z" /><path class="female-hoodie" d="M376 735 Q426 670 490 668 Q540 708 590 668 Q654 670 704 735 L750 1088 L330 1088 Z" fill="#f97316" /></g>`,
      facePath: "M540 266 C435 266 383 334 393 443 L410 528 C425 594 477 629 540 645 C603 629 655 594 670 528 L687 443 C697 334 645 266 540 266 Z",
      nosePath: "M529 511 Q540 533 551 511",
      features: {
        details: "",
        ears: `<path d="M394 390 Q354 404 371 449 M686 390 Q726 404 709 449" fill="none" stroke="#ea580c" stroke-width="10" />`,
        cheeks: `<circle cx="444" cy="524" r="22" fill="#fbbf24" opacity="0.35" stroke="none" /><circle cx="636" cy="524" r="22" fill="#fbbf24" opacity="0.35" stroke="none" />`,
        eyeLeft: `<ellipse cx="475" cy="420" rx="40" ry="50" fill="#ffffff" stroke-width="5" />`, eyeRight: `<ellipse cx="605" cy="420" rx="40" ry="50" fill="#ffffff" stroke-width="5" />`,
        pupilLeft: `<circle cx="475" cy="425" r="17" fill="var(--iris-color)" stroke="none" /><circle cx="470" cy="420" r="6" fill="#ffffff" stroke="none" />`, pupilRight: `<circle cx="605" cy="425" r="17" fill="var(--iris-color)" stroke="none" /><circle cx="600" cy="420" r="6" fill="#ffffff" stroke="none" />`,
        browLeft: `<path d="M441 362 Q475 344 509 362" fill="none" stroke="#7c2d12" stroke-width="10" />`, browRight: `<path d="M571 362 Q605 344 639 362" fill="none" stroke="#7c2d12" stroke-width="10" />`
      },
      rig: rigMetrics({ shoulders: [[414, 738], [666, 738]], arms: [111, 121], gesture: [0.8, 0.88, 0, -2], head: [540, 446], eyes: [475, 420, 605, 420], eyeScale: [0.85, 0.92], brows: [475, 361, 605, 361], mouth: [540, 574, 0.64, 0.66], nose: [0, 0, 0.75, 0.76, 0, 540, 510], wearables: { glasses: [540, 420, 0.7], hat: [540, 258, 0.8], earrings: [[394, 456], [686, 456], 0.74], neckwear: [540, 666, 0.8] }, handScale: 0.8 }),
      accessories: { earrings: "none", neckwear: "none" }
    }),
    profile({
      id: "ayan-copy", name: "Ayan Copy", gender: "male", kind: "human", outfit: "crewneck",
      description: "Exact duplicate of Ayan — short swept brown quiff, angular tapered jaw and teal crewneck with geometric chest patch.",
      source: "https://codepen.io/alvaromontoro/pen/WNGEjMz",
      palette: palette("#e7a37b", "#5c3c2b", "#247c74", "#19574f", "#439d89", "#e8c486", "#e8c486", "#c28160", "#3b4636"), background: "cream-grid",
      frontHair: baseAvatars[1].frontHair,
      backHair: baseAvatars[1].backHair,
      body: baseAvatars[1].body,
      facePath: "M540 245 C454 241 402 291 385 361 L369 456 C366 499 376 541 398 575 L437 609 Q450 621 477 621 L603 621 Q630 621 643 609 L682 575 C704 541 714 499 711 456 L695 361 C678 291 626 241 540 245 Z",
      nosePath: "M531 492 L521 514 Q538 528 558 513",
      features: { ...classicFeatures },
      rig: rigMetrics({ shoulders: [[385, 742], [695, 742]], arms: [125, 132], gesture: [0.87, 0.92, 0, 0], head: [540, 444], eyes: [465, 423, 615, 423], eyeScale: [1.0, 1.02], brows: [465, 348, 615, 348], mouth: [540, 572, 0.66, 0.64], nose: [0, 0, 0.72, 0.72, 0, 540, 510], wearables: { glasses: [540, 423, 0.82], hat: [540, 280, 0.82], earrings: [[390, 470], [690, 470], 0.82], neckwear: [540, 662, 0.84] }, handScale: 0.86 }),
      accessories: { earrings: "none", neckwear: "none" }
    }),
    profile({
      id: "aarav", name: "Aarav", gender: "male", kind: "human", outfit: "crewneck",
      description: "A calm systems engineer with a swept navy quiff, white crew collar and soft lineless shading, ported from the commercial vector character pack.",
      source: "https://example.com/commercial-vector-character-system",
      palette: palette("#f3c39c", "#252c3e", "#252c42", "#14192a", "#ffffff", "#364059", "#d9a177", "#bb745f", "#1e222d", "#1a2030"),
      background: "sky-grid",
      outlineWidth: 0,
      limbStyle: "flat",
      backHair: `<g stroke="none" transform="translate(540 250) scale(3.6) translate(-120 -52)">
        <path d="M62 104 C57 55 80 33 122 33 C160 33 183 55 178 104 L62 104 Z" fill="#1a2030" />
      </g>`,
      frontHair: `<g stroke="none" transform="translate(540 250) scale(3.6) translate(-120 -52)">
        <path d="M75 54 C57 42 44 47 56 60 C45 63 49 76 69 72 C72 66 74 60 75 54 Z" fill="#2a3346" />
        <path d="M66 96 C62 56 84 36 122 36 C156 36 178 54 174 90 C168 80 156 80 144 84 C128 89 106 96 88 93 C80 91 72 90 66 96 Z" fill="#2a3346" />
        <path d="M150 44 C164 50 172 60 174 76 C170 64 160 55 148 50 Z" fill="#364059" opacity="0.5" />
      </g>`,
      body: `<g transform="translate(540 250) scale(3.6) translate(-120 -52)" stroke="none">
        <path d="M66 166 C68 153 88 150 120 150 C152 150 172 153 174 166 L170 230 C178 262 184 292 186 334 L54 334 C56 292 62 262 70 230 Z" fill="#252c42" />
        <path d="M70 230 C62 262 56 292 54 334 L79 334 C75 294 79 262 85 234 Z" fill="#14192a" opacity="0.42" />
        <path d="M170 230 C178 262 184 292 186 334 L161 334 C165 294 161 262 155 234 Z" fill="#14192a" opacity="0.42" />
        <path d="M74 170 Q97 158 120 158" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.1" stroke-linecap="round" />
        <path d="M101 140 L101 160 C101 172 139 172 139 160 L139 140 Z" fill="#f3c39c" />
        <path d="M101 142 Q120 158 139 142 L139 153 Q120 166 101 153 Z" fill="#d9a177" opacity="0.85" />
        <path d="M92 157 C94 184 146 184 148 157 L139 155 C137 175 103 175 101 155 Z" fill="#ffffff" />
        <path d="M84 176 C80 200 78 222 79 244 M156 176 C160 200 162 222 161 244" fill="none" stroke="#14192a" stroke-width="2.4" opacity="0.38" stroke-linecap="round" />
      </g>`,
      facePath: "M518.4 250 H561.6 A165.6 165.6 0 0 1 727.2 415.6 V437.2 A165.6 165.6 0 0 1 561.6 602.8 H518.4 A165.6 165.6 0 0 1 352.8 437.2 V415.6 A165.6 165.6 0 0 1 518.4 250 Z",
      nosePath: "M514.8 480.4 Q540 498.4 565.2 480.4",
      features: features({
        details: `<g stroke="none" transform="translate(540 250) scale(3.6) translate(-120 -52)">
          <ellipse cx="120" cy="142" rx="31" ry="9" fill="#d9a177" opacity="0.3" />
          <ellipse cx="120" cy="113.5" rx="6.5" ry="4.2" fill="#d9a177" opacity="0.45" />
        </g>`,
        ears: `<g stroke="none" transform="translate(540 250) scale(3.6) translate(-120 -52)">
          <ellipse cx="65" cy="107" rx="12" ry="13.5" fill="#f3c39c" />
          <ellipse cx="66" cy="107" rx="6.5" ry="7.5" fill="#d9a177" />
          <ellipse cx="175" cy="107" rx="12" ry="13.5" fill="#f3c39c" />
          <ellipse cx="174" cy="107" rx="6.5" ry="7.5" fill="#d9a177" />
        </g>`,
        cheeks: `<g stroke="none" transform="translate(540 250) scale(3.6) translate(-120 -52)">
          <ellipse cx="88" cy="120" rx="14" ry="7" fill="#de7e78" opacity="0.2" />
          <ellipse cx="152" cy="120" rx="14" ry="7" fill="#de7e78" opacity="0.2" />
        </g>`,
        eyeLeft: `<g stroke="none" transform="translate(540 250) scale(3.6) translate(-120 -52)">
          <ellipse cx="97" cy="106" rx="10.2" ry="10.2" fill="#ffffff" />
          <path d="M86.5 100.4 Q97 94.2 107.5 100.4" fill="none" stroke="#1e222d" stroke-width="3.2" stroke-linecap="round" />
        </g>`,
        eyeRight: `<g stroke="none" transform="translate(540 250) scale(3.6) translate(-120 -52)">
          <ellipse cx="143" cy="106" rx="10.2" ry="10.2" fill="#ffffff" />
          <path d="M132.5 100.4 Q143 94.2 153.5 100.4" fill="none" stroke="#1e222d" stroke-width="3.2" stroke-linecap="round" />
        </g>`,
        pupilLeft: `<g stroke="none" transform="translate(540 250) scale(3.6) translate(-120 -52)">
          <circle cx="97.5" cy="106" r="7.4" fill="var(--iris-color)" />
          <circle cx="94.8" cy="103.2" r="2.9" fill="#ffffff" />
          <circle cx="100.2" cy="108.8" r="1.3" fill="#ffffff" />
        </g>`,
        pupilRight: `<g stroke="none" transform="translate(540 250) scale(3.6) translate(-120 -52)">
          <circle cx="142.5" cy="106" r="7.4" fill="var(--iris-color)" />
          <circle cx="139.8" cy="103.2" r="2.9" fill="#ffffff" />
          <circle cx="145.2" cy="108.8" r="1.3" fill="#ffffff" />
        </g>`,
        browLeft: `<g stroke="none" transform="translate(540 250) scale(3.6) translate(-120 -52)">
          <path d="M84 90 Q97 85 108 89" fill="none" stroke="#252c3e" stroke-width="5" stroke-linecap="round" />
        </g>`,
        browRight: `<g stroke="none" transform="translate(540 250) scale(3.6) translate(-120 -52)">
          <path d="M132 89 Q143 85 156 90" fill="none" stroke="#252c3e" stroke-width="5" stroke-linecap="round" />
        </g>`
      }),
      rig: rigMetrics({
        shoulders: [[345.6, 660.4], [734.4, 660.4]], arms: [150, 152], gesture: [0.95, 0.98, 0, 2],
        head: [540, 602.8], eyes: [457.2, 444.4, 622.8, 444.4], eyeScale: [1.12, 1.1],
        brows: [453.6, 379.6, 626.4, 379.6], mouth: [540, 548.8, 1, 1],
        nose: [0, 0, 1, 1, 0, 540, 480.4],
        wearables: { glasses: [540, 444.4, 0.9], hat: [540, 214, 0.92], earrings: [[338.4, 458.8], [741.6, 458.8], 0.85], neckwear: [540, 640, 0.95] },
        handScale: 0.9
      }),
      accessories: { earrings: "none", neckwear: "none" }
    }),
    // Ported Forma2D EGM v3.0 cast (assets/avatar-forma.js, generated by
    // scripts/port-forma2d.mjs). Art ships pre-baked in the 1080 presenter space.
    ...(globalThis.FormaAvatarSpecs ?? []).map(({ rigSpec, ...spec }) =>
      profile({ ...spec, rig: rigMetrics(rigSpec) })
    )
  ];

  const avatars = freeze([...originalProfiles, ...newProfiles]);

  const tshirtBody = `<g class="female-outline"><path class="female-skin" d="M492 594 L588 594 L588 675 Q540 703 492 675 Z" /><path class="female-hoodie" d="M376 735 Q426 670 490 668 Q540 708 590 668 Q654 670 704 735 L750 1088 L330 1088 Z" /><path d="M490 668 Q540 714 590 668" fill="none" stroke="var(--cloth-trim)" stroke-width="12" /><path d="M346 1048 Q540 1072 734 1048" fill="none" stroke="var(--cloth-shade)" stroke-width="18" /></g>`;
  const royalBody = `<g class="female-outline"><path class="female-skin" d="M480 594 L600 594 L600 676 Q540 708 480 676 Z" /><path class="female-hoodie" d="M350 734 Q410 665 480 666 L540 708 L600 666 Q670 665 730 734 L776 1088 L304 1088 Z" /><path d="M408 681 L346 793 L411 838 L480 687 Z M672 681 L734 793 L669 838 L600 687 Z" fill="#b82d45" /><path d="M505 707 H575 L591 1088 H489 Z" fill="var(--cloth-trim)" /><circle cx="540" cy="811" r="9" fill="var(--accent-color)" /><circle cx="540" cy="914" r="9" fill="var(--accent-color)" /></g>`;
  const armorBody = `<g class="female-outline"><path class="female-skin" d="M489 594 L591 594 L591 674 Q540 700 489 674 Z" /><path class="female-hoodie" d="M363 719 Q420 661 489 664 Q540 700 591 664 Q660 661 717 719 L757 1088 L323 1088 Z" /><path d="M377 731 H703 L686 936 H394 Z" fill="#bfc4ca" /><path d="M394 758 H686 M389 819 H691 M384 880 H696" fill="none" stroke="#858d96" stroke-width="10" /><path d="M363 940 H717 V998 H363 Z" fill="#4c3829" /><rect x="511" y="944" width="58" height="50" rx="8" fill="#d5b256" /></g>`;
  const cloakBody = `<g class="female-outline"><path class="female-skin" d="M499 596 L581 596 L581 675 Q540 698 499 675 Z" /><path class="female-hoodie" d="M348 720 Q417 660 497 666 L540 701 L583 666 Q663 660 732 720 L794 1088 L286 1088 Z" /><path d="M348 720 L476 661 L540 724 L604 661 L732 720 L670 846 L540 783 L410 846 Z" fill="var(--cloth-shade)" /><path d="M540 783 V1088" fill="none" stroke="var(--cloth-trim)" stroke-width="9" /><circle cx="540" cy="740" r="14" fill="var(--accent-color)" /></g>`;

  const outfits = freeze([
    { id: "profile", name: "Character profile", bodyMarkup: "" },
    { id: "hoodie", name: "Hoodie", bodyMarkup: baseAvatars[0].body },
    { id: "crewneck", name: "Crewneck", bodyMarkup: baseAvatars[1].body },
    { id: "blazer", name: "Blazer", bodyMarkup: baseAvatars[2].body },
    { id: "sweater", name: "Sweater", bodyMarkup: baseAvatars[3].body },
    { id: "tshirt", name: "T-shirt", bodyMarkup: tshirtBody },
    { id: "royal", name: "Royal tunic", bodyMarkup: royalBody },
    { id: "armor", name: "Plate armor", bodyMarkup: armorBody },
    { id: "cloak", name: "Inquisitor cloak", bodyMarkup: cloakBody }
  ]);

  const glasses = freeze([
    { id: "none", name: "None", markup: "" },
    { id: "round", name: "Round", markup: `<circle cx="-82" cy="0" r="50" fill="none" stroke="var(--outline-color)" stroke-width="9" /><circle cx="82" cy="0" r="50" fill="none" stroke="var(--outline-color)" stroke-width="9" /><path d="M-32 0 Q0 -15 32 0 M-132 -4 L-164 -17 M132 -4 L164 -17" fill="none" stroke="var(--outline-color)" stroke-width="9" />` },
    { id: "square", name: "Square", markup: `<rect x="-139" y="-48" width="112" height="94" rx="16" fill="none" stroke="var(--outline-color)" stroke-width="9" /><rect x="27" y="-48" width="112" height="94" rx="16" fill="none" stroke="var(--outline-color)" stroke-width="9" /><path d="M-27 -2 H27 M-139 -8 L-168 -21 M139 -8 L168 -21" fill="none" stroke="var(--outline-color)" stroke-width="9" />` },
    { id: "sunglasses", name: "Sunglasses", markup: `<path d="M-143 -45 H-24 L-31 35 Q-82 71 -133 34 Z M24 -45 H143 L133 34 Q82 71 31 35 Z" fill="#20232c" stroke="var(--outline-color)" stroke-width="9" /><path d="M-24 -10 Q0 -25 24 -10 M-143 -22 L-169 -30 M143 -22 L169 -30" fill="none" stroke="var(--outline-color)" stroke-width="9" /><path d="M-118 -27 L-53 25 M47 -27 L112 25" stroke="#ffffff" stroke-width="9" opacity="0.22" />` }
  ]);

  const hats = freeze([
    { id: "none", name: "None", backMarkup: "", frontMarkup: "" },
    { id: "cap", name: "Cap", backMarkup: `<path d="M-172 17 Q-149 -117 0 -129 Q149 -117 172 17 Z" fill="var(--cloth-shade)" stroke="var(--outline-color)" stroke-width="7" />`, frontMarkup: `<path d="M-174 13 Q0 -39 174 13 L251 48 Q103 73 -29 43 L-174 35 Z" fill="var(--hoodie-color)" stroke="var(--outline-color)" stroke-width="7" /><path d="M0 -126 V-24" stroke="var(--cloth-trim)" stroke-width="7" />` },
    { id: "backwards-cap", name: "Backwards cap", backMarkup: `<path d="M-173 18 Q-146 -116 0 -128 Q146 -116 173 18 Z" fill="var(--hoodie-color)" stroke="var(--outline-color)" stroke-width="7" /><path d="M105 5 L234 57 Q150 88 76 48 Z" fill="var(--cloth-shade)" stroke="var(--outline-color)" stroke-width="7" />`, frontMarkup: `<path d="M-177 17 Q0 -25 177 17" fill="none" stroke="var(--cloth-trim)" stroke-width="12" /><rect x="-37" y="-126" width="74" height="31" rx="14" fill="var(--cloth-trim)" />` },
    { id: "beanie", name: "Beanie", backMarkup: `<path d="M-173 25 Q-153 -124 0 -151 Q153 -124 173 25 Z" fill="var(--hoodie-color)" stroke="var(--outline-color)" stroke-width="7" /><circle cx="0" cy="-159" r="28" fill="var(--cloth-trim)" stroke="var(--outline-color)" stroke-width="7" />`, frontMarkup: `<path d="M-178 14 Q0 -25 178 14 L174 58 Q0 29 -174 58 Z" fill="var(--cloth-shade)" stroke="var(--outline-color)" stroke-width="7" />` },
    { id: "crown", name: "Crown", backMarkup: `<path d="M-161 24 L-138 -118 L-57 -39 L0 -151 L57 -39 L138 -118 L161 24 Z" fill="#edc443" stroke="var(--outline-color)" stroke-width="7" />`, frontMarkup: `<path d="M-166 12 H166 V61 Q0 84 -166 61 Z" fill="#d8a72e" stroke="var(--outline-color)" stroke-width="7" /><circle cx="-91" cy="38" r="13" fill="#d8324d" /><circle cx="0" cy="43" r="16" fill="#456caa" /><circle cx="91" cy="38" r="13" fill="#d8324d" />` },
    { id: "helmet", name: "Helmet", backMarkup: `<path d="M-179 33 Q-159 -130 0 -157 Q159 -130 179 33 Z" fill="#bfc4ca" stroke="var(--outline-color)" stroke-width="8" />`, frontMarkup: `<path d="M-184 25 H184 L198 67 H-198 Z" fill="#90979f" stroke="var(--outline-color)" stroke-width="8" /><path d="M0 -150 V58" stroke="#e2e5e8" stroke-width="17" />` },
    { id: "inquisitor", name: "Inquisitor", backMarkup: `<path d="M-126 17 L-69 -174 H69 L126 17 Z" fill="#9d2032" stroke="var(--outline-color)" stroke-width="8" />`, frontMarkup: `<path d="M-251 13 Q0 -75 251 13 L194 71 Q0 36 -194 71 Z" fill="#aa2638" stroke="var(--outline-color)" stroke-width="8" /><path d="M-70 -43 H70" stroke="#d7a23e" stroke-width="12" />` }
  ]);

  const earrings = freeze([
    { id: "profile", name: "Character profile", markup: "" },
    { id: "none", name: "None", markup: "" },
    { id: "hoops", name: "Hoops", markup: `<circle cx="0" cy="29" r="25" fill="none" stroke="#d9a62f" stroke-width="8" />` },
    { id: "studs", name: "Studs", markup: `<circle cx="0" cy="5" r="10" fill="#f4d469" stroke="var(--outline-color)" stroke-width="4" />` },
    { id: "drops", name: "Drops", markup: `<path d="M0 0 V33" stroke="#f8ecd7" stroke-width="5" /><circle cx="0" cy="40" r="4" fill="#f8ecd7" /><path d="M0 52 V63" /><path d="M-7 64 L7 78 M7 64 L-7 78" stroke="#f8ecd7" stroke-width="5.5" />` }
  ]);

  const neckwear = freeze([
    { id: "profile", name: "Character profile", markup: "" },
    { id: "none", name: "None", markup: "" },
    { id: "pearls", name: "Pearls", markup: `<path d="M-72 -7 Q0 45 72 -7" fill="none" stroke="#c4aa76" stroke-width="5" /><g fill="#fff2d8" stroke="var(--outline-color)" stroke-width="2"><circle cx="-65" cy="-2" r="9" /><circle cx="-43" cy="12" r="9" /><circle cx="-20" cy="22" r="9" /><circle cx="4" cy="25" r="9" /><circle cx="28" cy="20" r="9" /><circle cx="51" cy="9" r="9" /><circle cx="69" cy="-5" r="9" /></g>` },
    { id: "chain", name: "Chain", markup: `<path d="M-79 -8 Q0 58 79 -8" fill="none" stroke="#d9aa2f" stroke-width="11" stroke-dasharray="6 9" /><circle cx="0" cy="48" r="14" fill="#e8bf47" stroke="var(--outline-color)" stroke-width="4" />` },
    { id: "tie", name: "Tie", markup: `<path d="M-28 -12 L0 16 L28 -12 L18 33 L0 47 L-18 33 Z" fill="var(--cloth-trim)" stroke="var(--outline-color)" stroke-width="5" /><path d="M0 45 L29 154 L0 184 L-29 154 Z" fill="var(--cloth-shade)" stroke="var(--outline-color)" stroke-width="5" />` }
  ]);

  const backgrounds = freeze([
    { id: "white-grid", name: "Original White", color: "#ffffff", dotColor: "#000000", dotOpacity: 1, grid: true },
    { id: "cream-grid", name: "Warm Cream", color: "#f4eee2", dotColor: "#8d7961", dotOpacity: 0.44, grid: true },
    { id: "sky-grid", name: "Soft Sky", color: "#e8eff7", dotColor: "#6b809d", dotOpacity: 0.45, grid: true },
    { id: "night-grid", name: "Midnight Blue", color: "#192238", dotColor: "#889abb", dotOpacity: 0.38, grid: true },
    { id: "solid-white", name: "Solid White", color: "#ffffff", dotColor: "#000000", dotOpacity: 0, grid: false },
    { id: "solid-black", name: "Solid Black", color: "#000000", dotColor: "#ffffff", dotOpacity: 0, grid: false },
    { id: "chroma-green", name: "Chroma Green", color: "#00ff00", dotColor: "#000000", dotOpacity: 0, grid: false },
    { id: "transparent", name: "Transparent", color: "none", dotColor: "#000000", dotOpacity: 0, grid: false },
    { id: "custom", name: "Custom Image", color: "#ffffff", dotColor: "#000000", dotOpacity: 0, grid: false }
  ]);

  const lookup = (items, fallback = 0) => (id) => items.find((item) => item.id === id) || items[fallback];
  globalThis.AvatarProfiles = Object.freeze({
    avatars, backgrounds, outfits, glasses, hats, earrings, neckwear,
    getAvatar: lookup(avatars),
    getBackground: lookup(backgrounds),
    getOutfit: lookup(outfits),
    getGlasses: lookup(glasses),
    getHat: lookup(hats),
    getEarrings: lookup(earrings),
    getNeckwear: lookup(neckwear)
  });
})();
