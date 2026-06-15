import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const SplitText = ({
  text = '',
  className = '',
  delay = 50,
  duration = 1.25,
  ease = 'power3.out',
  splitType = 'chars',
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = '-100px',
  textAlign = 'center',
  tag = 'p',
  onLetterAnimationComplete,
  loop = false,
  loopDelay = 4
}) => {
  const ref = useRef(null);
  const animationCompletedRef = useRef(false);
  const onCompleteRef = useRef(onLetterAnimationComplete);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Keep callback ref updated
  useEffect(() => {
    onCompleteRef.current = onLetterAnimationComplete;
  }, [onLetterAnimationComplete]);

  useEffect(() => {
    if (document.fonts && document.fonts.status === 'loaded') {
      setFontsLoaded(true);
    } else if (document.fonts) {
      document.fonts.ready.then(() => {
        setFontsLoaded(true);
      });
    } else {
      setFontsLoaded(true);
    }
  }, []);

  useGSAP(
    () => {
      if (!ref.current || !text || !fontsLoaded) return;
      if (animationCompletedRef.current && !loop) return;

      const el = ref.current;
      let targets;
      if (splitType.includes('chars')) {
        targets = el.querySelectorAll('.split-char');
      } else if (splitType.includes('words')) {
        targets = el.querySelectorAll('.split-word');
      } else {
        targets = el.querySelectorAll('.split-char');
      }

      if (!targets || targets.length === 0) return;

      let animation;

      if (loop) {
        // Timeline that plays immediately and repeats after loopDelay seconds
        const tl = gsap.timeline({
          repeat: -1,
          repeatDelay: loopDelay
        });

        tl.fromTo(
          targets,
          { ...from },
          {
            ...to,
            duration,
            ease,
            stagger: delay / 1000,
            willChange: 'transform, opacity',
            force3D: true
          }
        );

        tl.call(() => {
          onCompleteRef.current?.();
        });

        animation = tl;
      } else {
        const startPct = (1 - threshold) * 100;
        const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin);
        const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0;
        const marginUnit = marginMatch ? marginMatch[2] || 'px' : 'px';
        const sign =
          marginValue === 0
            ? ''
            : marginValue < 0
              ? `-=${Math.abs(marginValue)}${marginUnit}`
              : `+=${marginValue}${marginUnit}`;
        const start = `top ${startPct}%${sign}`;

        animation = gsap.fromTo(
          targets,
          { ...from },
          {
            ...to,
            duration,
            ease,
            stagger: delay / 1000,
            scrollTrigger: {
              trigger: el,
              start,
              once: true,
              fastScrollEnd: true,
              anticipatePin: 0.4
            },
            onComplete: () => {
              animationCompletedRef.current = true;
              onCompleteRef.current?.();
            },
            willChange: 'transform, opacity',
            force3D: true
          }
        );
      }

      return () => {
        if (loop) {
          animation.kill();
        } else {
          ScrollTrigger.getAll().forEach(st => {
            if (st.trigger === el) st.kill();
          });
        }
      };
    },
    {
      dependencies: [
        text,
        delay,
        duration,
        ease,
        splitType,
        JSON.stringify(from),
        JSON.stringify(to),
        threshold,
        rootMargin,
        fontsLoaded,
        loop,
        loopDelay
      ],
      scope: ref
    }
  );

  const renderContent = () => {
    if (!text) return null;

    const initialOpacity = from && from.opacity !== undefined ? from.opacity : 0;

    if (splitType.includes('chars')) {
      const words = text.split(' ');
      return words.map((word, wordIndex) => {
        const chars = Array.from(word);
        return (
          <span
            key={wordIndex}
            className="split-word"
            style={{ display: 'inline-block', whiteSpace: 'nowrap' }}
          >
            {chars.map((char, charIndex) => (
              <span
                key={charIndex}
                className="split-char"
                style={{ display: 'inline-block', opacity: initialOpacity }}
              >
                {char}
              </span>
            ))}
            {wordIndex < words.length - 1 && (
              <span className="split-space" style={{ display: 'inline-block' }}>
                &nbsp;
              </span>
            )}
          </span>
        );
      });
    }

    if (splitType.includes('words')) {
      const words = text.split(' ');
      return words.map((word, wordIndex) => (
        <span
          key={wordIndex}
          className="split-word"
          style={{ display: 'inline-block', opacity: initialOpacity }}
        >
          {word}
          {wordIndex < words.length - 1 && (
            <span className="split-space" style={{ display: 'inline-block' }}>
              &nbsp;
            </span>
          )}
        </span>
      ));
    }

    return text;
  };

  const style = {
    textAlign,
    overflow: 'hidden',
    display: 'inline-block',
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    willChange: 'transform, opacity'
  };
  const classes = `split-parent ${className}`;
  const Tag = tag || 'p';

  return (
    <Tag ref={ref} style={style} className={classes}>
      {renderContent()}
    </Tag>
  );
};

export default SplitText;
