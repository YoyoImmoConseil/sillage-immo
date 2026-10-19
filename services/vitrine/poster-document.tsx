import path from "node:path";
import {
  Document,
  Font,
  Image,
  Page,
  Polygon,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import React, { type ReactElement } from "react";
import type { VitrinePosterContent } from "@/lib/vitrine/poster-content";
import {
  CLIMATE_LETTER_LIGHT,
  CLIMATE_SCALE_COLORS,
  DPE_BAR_WIDTHS,
  DPE_CLASSES,
  ENERGY_LETTER_LIGHT,
  ENERGY_SCALE_COLORS,
  type DpeClass,
} from "@/lib/vitrine/dpe";
import {
  CARD,
  CARD_CENTER_X,
  CARD_PHOTO,
  CARD_RHYTHM,
  CARD_TEXT_WIDTH,
  COLORS,
  DOTS,
  DPE_BLOCK,
  DPE_SCALE,
  DPE_SCALE_LABEL_TOP,
  DPE_TEXT,
  DPE_TITLE_TOP,
  FONTS,
  FOOTER,
  LOGO,
  MAIN_PHOTO,
  PAGE,
  QR_BLOCK,
  QR_CAPTION_TOP,
  QR_FRAME,
  REFERENCE_TOP,
} from "@/lib/vitrine/poster-layout";
import {
  VITRINE_CLIMATE_SCALE_LABEL,
  VITRINE_DPE_TITLE,
  VITRINE_ENERGY_SCALE_LABEL,
  VITRINE_QR_CAPTION,
} from "@/lib/vitrine/poster-copy";

export type VitrinePosterImage = { data: Buffer; format: "jpg" | "png" };
export type VitrinePosterLogo = VitrinePosterImage & { width: number; height: number };

export type VitrinePosterDocumentProps = {
  content: VitrinePosterContent;
  mainPhoto: VitrinePosterImage | null;
  cardPhoto: VitrinePosterImage | null;
  logo: VitrinePosterLogo;
  /** Matrice du QR : `modules[y][x]` vrai pour un module sombre. */
  qrModules: boolean[][];
  /** Filigrane « aperçu » quand des données bloquantes manquent. */
  draftWatermark?: string | null;
};

// --- Polices -------------------------------------------------------------------

const FONT_DIR = path.join(process.cwd(), "assets", "vitrine", "fonts");

let fontsRegistered = false;
export const registerVitrineFonts = () => {
  if (fontsRegistered) return;
  fontsRegistered = true;
  Font.register({
    family: FONTS.serif,
    fonts: [
      { src: path.join(FONT_DIR, "PlayfairDisplay-Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "PlayfairDisplay-Bold.ttf"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: FONTS.sans,
    fonts: [
      { src: path.join(FONT_DIR, "Montserrat-Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "Montserrat-Bold.ttf"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: FONTS.text,
    fonts: [
      // Hanken Grotesk (OFL) : successeur libre de HK Grotesk, même dessin,
      // jeu de glyphes complet (« m² » notamment, absent du sous-ensemble
      // HK Grotesk du site).
      { src: path.join(FONT_DIR, "HankenGrotesk-Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "HankenGrotesk-Bold.ttf"), fontWeight: 700 },
    ],
  });
  // Pas de césure : les mots de l'affiche ne doivent jamais être coupés.
  Font.registerHyphenationCallback((word) => [word]);
};

// Décalage entre le haut de la boîte de texte react-pdf (lineHeight = 1) et le
// haut des capitales, en fraction de la taille : calibré sur le rendu réel pour
// retomber sur les cotes mesurées de la V2.
const CAP_TOP_OFFSET: Record<string, number> = {
  [FONTS.serif]: 0.3,
  [FONTS.sans]: 0.05,
  [FONTS.text]: 0.22,
};

type AbsTextProps = {
  font: string;
  size: number;
  weight?: 400 | 700;
  color?: string;
  top: number;
  left?: number;
  width?: number;
  align?: "left" | "center" | "right";
  lineHeight?: number;
  children: string;
};

/** Texte positionné par le haut de ses capitales, comme mesuré sur la V2. */
const AbsText = ({
  font,
  size,
  weight = 400,
  color = COLORS.sand,
  top,
  left = 0,
  width,
  align = "left",
  lineHeight = 1,
  children,
}: AbsTextProps) => (
  <Text
    style={{
      position: "absolute",
      top: top - CAP_TOP_OFFSET[font] * size,
      left,
      width,
      fontFamily: font,
      fontSize: size,
      fontWeight: weight,
      color,
      textAlign: align,
      lineHeight,
    }}
  >
    {children}
  </Text>
);

const Dots = ({ top }: { top: number }) => {
  const total = DOTS.count * DOTS.size + (DOTS.count - 1) * (DOTS.gap - DOTS.size);
  const startX = CARD_CENTER_X - total / 2;
  return (
    <Svg
      style={{ position: "absolute", top, left: 0 }}
      width={PAGE.width}
      height={DOTS.size}
      viewBox={`0 0 ${PAGE.width} ${DOTS.size}`}
    >
      {Array.from({ length: DOTS.count }, (_, index) => (
        <Rect
          key={index}
          x={startX + index * DOTS.gap}
          y={0}
          width={DOTS.size}
          height={DOTS.size}
          rx={DOTS.size / 2}
          fill={COLORS.sand}
        />
      ))}
    </Svg>
  );
};

// --- Carte marine -----------------------------------------------------------------

const cardTextLeft = CARD_CENTER_X - CARD_TEXT_WIDTH / 2;

/**
 * Rythme vertical de la carte : les cotes de la V2 sont respectées tant que le
 * contenu a la taille de la V2 (4 mentions, 3 points forts, 3 lignes de
 * caractéristiques). Au-delà, les espacements sont comprimés proportionnellement
 * pour rester dans la carte.
 */
const computeCardRhythm = (legalCount: number, highlightCount: number, characteristicsLines: number) => {
  const r = CARD_RHYTHM;
  const legalHeight = Math.max(legalCount - 1, 0) * r.legalPitch;
  const highlightsHeight = Math.max(highlightCount - 1, 0) * r.highlightsPitch;
  const characteristicsHeight = Math.max(characteristicsLines - 1, 0) * r.characteristicsPitch + 14;
  const bottomLimit = CARD.y + CARD.h - 12;
  const natural =
    r.legalTop +
    legalHeight +
    r.dots3GapAfterLegal +
    r.highlightsGapAfterDots +
    highlightsHeight +
    r.characteristicsGapAfterHighlights +
    characteristicsHeight;
  const overflow = natural - bottomLimit;
  const compress = overflow > 0 ? Math.max(0.6, 1 - overflow / 120) : 1;
  const legalTop = r.legalTop;
  const legalPitch = r.legalPitch * (overflow > 0 ? 0.92 : 1);
  const lastLegalTop = legalTop + Math.max(legalCount - 1, 0) * legalPitch;
  const dots3Top = lastLegalTop + r.dots3GapAfterLegal * compress;
  const highlightsTop = dots3Top + r.highlightsGapAfterDots * compress;
  const highlightsPitch = r.highlightsPitch * (overflow > 0 ? 0.9 : 1);
  const lastHighlightTop = highlightsTop + Math.max(highlightCount - 1, 0) * highlightsPitch;
  const characteristicsTop = lastHighlightTop + r.characteristicsGapAfterHighlights * compress;
  return { legalTop, legalPitch, dots3Top, highlightsTop, highlightsPitch, characteristicsTop };
};

const estimateCharacteristicsLines = (text: string) => {
  // HK Grotesk 12 pt : ≈ 5,6 pt par caractère en moyenne sur 300 pt de large.
  return Math.max(1, Math.ceil((text.length * 5.6) / CARD_TEXT_WIDTH));
};

const Card = ({ content, photo }: { content: VitrinePosterContent; photo: VitrinePosterImage | null }) => {
  const rhythm = computeCardRhythm(
    content.legalLines.length,
    content.highlights.length,
    estimateCharacteristicsLines(content.characteristicsLine)
  );
  return (
    <>
      <View
        style={{
          position: "absolute",
          left: CARD.x,
          top: CARD.y,
          width: CARD.w,
          height: CARD.h,
          backgroundColor: COLORS.navy,
        }}
      />
      {photo ? (
        <Image
          src={photo}
          style={{
            position: "absolute",
            left: CARD_PHOTO.x,
            top: CARD_PHOTO.y,
            width: CARD_PHOTO.w,
            height: CARD_PHOTO.h,
            objectFit: "cover",
          }}
        />
      ) : null}
      <AbsText font={FONTS.serif} size={34.5} top={CARD_RHYTHM.headlineTop} left={cardTextLeft} width={CARD_TEXT_WIDTH} align="center">
        {content.headline}
      </AbsText>
      <Dots top={CARD_RHYTHM.dots1Top} />
      <AbsText font={FONTS.sans} size={12.7} top={CARD_RHYTHM.typeTop} left={cardTextLeft} width={CARD_TEXT_WIDTH} align="center">
        {content.typeLine}
      </AbsText>
      <AbsText font={FONTS.sans} size={16.5} weight={700} top={CARD_RHYTHM.locationTop} left={cardTextLeft - 10} width={CARD_TEXT_WIDTH + 20} align="center">
        {content.locationLine}
      </AbsText>
      <Dots top={CARD_RHYTHM.dots2Top} />
      <AbsText font={FONTS.serif} size={52.5} weight={700} top={CARD_RHYTHM.priceTop} left={cardTextLeft - 10} width={CARD_TEXT_WIDTH + 20} align="center">
        {/* Playfair Display rend l'espace insécable par un glyphe parasite : espace simple sur cette ligne unique. */}
        {content.priceLine.replace(/\u00a0/g, " ")}
      </AbsText>
      {content.legalLines.map((line, index) => (
        <AbsText
          key={`legal-${index}`}
          font={FONTS.text}
          size={12}
          top={rhythm.legalTop + index * rhythm.legalPitch}
          left={cardTextLeft - 10}
          width={CARD_TEXT_WIDTH + 20}
          align="center"
        >
          {line}
        </AbsText>
      ))}
      <Dots top={rhythm.dots3Top} />
      {content.highlights.map((line, index) => (
        <AbsText
          key={`highlight-${index}`}
          font={FONTS.sans}
          size={16.5}
          weight={700}
          top={rhythm.highlightsTop + index * rhythm.highlightsPitch}
          left={cardTextLeft - 10}
          width={CARD_TEXT_WIDTH + 20}
          align="center"
        >
          {line.toUpperCase()}
        </AbsText>
      ))}
      <AbsText
        font={FONTS.text}
        size={12}
        top={rhythm.characteristicsTop}
        left={cardTextLeft}
        width={CARD_TEXT_WIDTH}
        align="center"
        lineHeight={CARD_RHYTHM.characteristicsPitch / 12}
      >
        {content.characteristicsLine}
      </AbsText>
    </>
  );
};

// --- Bloc DPE ------------------------------------------------------------------------

const arrowPoints = (width: number, height: number, tip: number) =>
  `0,0 ${width - tip},0 ${width},${height / 2} ${width - tip},${height} 0,${height}`;

type ScaleProps = {
  x: number;
  selected: DpeClass;
  value: number | null;
  unit: string;
  colors: Record<DpeClass, string>;
  lightLetters: Record<DpeClass, boolean>;
};

const Scale = ({ x, selected, value, unit, colors, lightLetters }: ScaleProps) => {
  const { firstBarTop, pitch, barHeight, tip, letterInset, valueGap, selectedOutline } = DPE_SCALE;
  const widest = DPE_BAR_WIDTHS.G + selectedOutline + 2;
  const totalHeight = pitch * (DPE_CLASSES.length - 1) + barHeight + selectedOutline * 2;
  const originY = firstBarTop - selectedOutline;
  return (
    <>
      <Svg
        style={{ position: "absolute", left: x - selectedOutline, top: originY }}
        width={widest}
        height={totalHeight}
        viewBox={`0 0 ${widest} ${totalHeight}`}
      >
        {DPE_CLASSES.map((dpeClass, index) => {
          const width = DPE_BAR_WIDTHS[dpeClass];
          const y = selectedOutline + index * pitch;
          const isSelected = dpeClass === selected;
          return (
            <React.Fragment key={dpeClass}>
              {isSelected ? (
                <Polygon
                  points={arrowPoints(width + selectedOutline * 2, barHeight + selectedOutline * 2, tip + selectedOutline)}
                  fill={COLORS.navy}
                  transform={`translate(0 ${y - selectedOutline})`}
                />
              ) : null}
              <Polygon
                points={arrowPoints(width, barHeight, tip)}
                fill={colors[dpeClass]}
                transform={`translate(${selectedOutline} ${y})`}
              />
            </React.Fragment>
          );
        })}
      </Svg>
      {DPE_CLASSES.map((dpeClass, index) => (
        <AbsText
          key={`letter-${dpeClass}`}
          font={FONTS.sans}
          size={10}
          weight={700}
          color={lightLetters[dpeClass] ? COLORS.white : COLORS.navy}
          top={firstBarTop + index * pitch + 1.2}
          left={x + letterInset}
        >
          {dpeClass}
        </AbsText>
      ))}
      {typeof value === "number" ? (
        <AbsText
          font={FONTS.sans}
          size={13.5}
          weight={700}
          color={COLORS.navy}
          top={firstBarTop + DPE_CLASSES.indexOf(selected) * pitch - 2}
          left={x + DPE_BAR_WIDTHS[selected] + selectedOutline + valueGap}
        >
          {`${new Intl.NumberFormat("fr-FR").format(value)} ${unit}`}
        </AbsText>
      ) : null}
    </>
  );
};


const DpeBlock = ({ content }: { content: VitrinePosterContent }) => (
  <>
    <View
      style={{
        position: "absolute",
        left: DPE_BLOCK.x,
        top: DPE_BLOCK.y,
        width: DPE_BLOCK.w,
        height: DPE_BLOCK.h,
        backgroundColor: COLORS.sand,
      }}
    />
    <AbsText font={FONTS.sans} size={10.5} weight={700} color={COLORS.navy} top={DPE_TITLE_TOP} left={DPE_SCALE.energyX}>
      {VITRINE_DPE_TITLE}
    </AbsText>
    {content.energy.kind === "scales" ? (
      <>
        <AbsText font={FONTS.text} size={9.7} weight={700} color={COLORS.navy} top={DPE_SCALE_LABEL_TOP} left={DPE_SCALE.energyX}>
          {VITRINE_ENERGY_SCALE_LABEL}
        </AbsText>
        <AbsText font={FONTS.text} size={9.7} weight={700} color={COLORS.navy} top={DPE_SCALE_LABEL_TOP} left={DPE_SCALE.climateX}>
          {VITRINE_CLIMATE_SCALE_LABEL}
        </AbsText>
        <Scale
          x={DPE_SCALE.energyX}
          selected={content.energy.energyClass}
          value={content.energy.energyValue}
          unit="kWh/m²/an"
          colors={ENERGY_SCALE_COLORS}
          lightLetters={ENERGY_LETTER_LIGHT}
        />
        <Scale
          x={DPE_SCALE.climateX}
          selected={content.energy.climateClass}
          value={content.energy.climateValue}
          unit="kg CO₂/m²/an"
          colors={CLIMATE_SCALE_COLORS}
          lightLetters={CLIMATE_LETTER_LIGHT}
        />
      </>
    ) : null}
    <AbsText
      font={FONTS.text}
      size={DPE_TEXT.size}
      color={COLORS.navy}
      top={content.energy.kind === "scales" ? DPE_TEXT.top : DPE_SCALE_LABEL_TOP + 14}
      left={DPE_TEXT.x}
      width={DPE_TEXT.width}
      lineHeight={DPE_TEXT.lineHeight / DPE_TEXT.size}
    >
      {content.dpeParagraph}
    </AbsText>
  </>
);

// --- Bloc QR --------------------------------------------------------------------------

const QrBlock = ({ modules, logo }: { modules: boolean[][]; logo: VitrinePosterLogo }) => {
  const frameLeft = QR_BLOCK.x + (QR_BLOCK.w - QR_FRAME.size) / 2;
  const inner = QR_FRAME.size - QR_FRAME.padding * 2;
  const count = modules.length;
  const moduleSize = count > 0 ? inner / count : 0;
  const logoHeight = (LOGO.width * logo.height) / logo.width;
  return (
    <>
      <View
        style={{
          position: "absolute",
          left: QR_BLOCK.x,
          top: QR_BLOCK.y,
          width: QR_BLOCK.w,
          height: QR_BLOCK.h,
          backgroundColor: COLORS.navy,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: frameLeft,
          top: QR_FRAME.top,
          width: QR_FRAME.size,
          height: QR_FRAME.size,
          backgroundColor: COLORS.white,
          borderRadius: 4,
        }}
      />
      {count > 0 ? (
        <Svg
          style={{ position: "absolute", left: frameLeft + QR_FRAME.padding, top: QR_FRAME.top + QR_FRAME.padding }}
          width={inner}
          height={inner}
          viewBox={`0 0 ${count} ${count}`}
        >
          {modules.flatMap((row, y) =>
            row.map((dark, x) =>
              dark ? <Rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={COLORS.navy} /> : null
            )
          )}
        </Svg>
      ) : null}
      <AbsText font={FONTS.sans} size={9} weight={700} top={QR_CAPTION_TOP} left={QR_BLOCK.x} width={QR_BLOCK.w} align="center">
        {VITRINE_QR_CAPTION}
      </AbsText>
      <Image
        src={{ data: logo.data, format: logo.format }}
        style={{
          position: "absolute",
          left: QR_BLOCK.x + (QR_BLOCK.w - LOGO.width) / 2,
          top: LOGO.top,
          width: LOGO.width,
          height: logoHeight,
          objectFit: "contain",
        }}
      />
    </>
  );
};

// --- Document --------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: { backgroundColor: COLORS.white },
});

export const VitrinePosterDocument = ({
  content,
  mainPhoto,
  cardPhoto,
  logo,
  qrModules,
  draftWatermark,
}: VitrinePosterDocumentProps): ReactElement => {
  registerVitrineFonts();
  return (
    <Document title={`Fiche vitrine — ${content.locationLine}`} author="Sillage Immo" language="fr">
      <Page size="A3" orientation="landscape" style={styles.page}>
        {mainPhoto ? (
          <Image
            src={mainPhoto}
            style={{
              position: "absolute",
              left: MAIN_PHOTO.x,
              top: MAIN_PHOTO.y,
              width: MAIN_PHOTO.w,
              height: MAIN_PHOTO.h,
              objectFit: "cover",
            }}
          />
        ) : (
          <View
            style={{
              position: "absolute",
              left: MAIN_PHOTO.x,
              top: MAIN_PHOTO.y,
              width: MAIN_PHOTO.w,
              height: MAIN_PHOTO.h,
              backgroundColor: COLORS.sand,
            }}
          />
        )}
        {content.reference ? (
          <AbsText
            font={FONTS.text}
            size={9.7}
            color={COLORS.navy}
            top={REFERENCE_TOP}
            left={MAIN_PHOTO.x}
            width={MAIN_PHOTO.w}
            align="right"
          >
            {`Référence : ${content.reference}`}
          </AbsText>
        ) : null}
        <Card content={content} photo={cardPhoto} />
        <DpeBlock content={content} />
        <QrBlock modules={qrModules} logo={logo} />
        <AbsText
          font={FONTS.text}
          size={8.2}
          color={COLORS.navy}
          top={FOOTER.top}
          left={FOOTER.x}
          width={FOOTER.width}
          align="center"
          lineHeight={12.2 / 8.2}
        >
          {content.footer}
        </AbsText>
        {draftWatermark ? (
          <Text
            style={{
              position: "absolute",
              left: 0,
              top: 300,
              width: PAGE.width,
              textAlign: "center",
              fontFamily: FONTS.sans,
              fontWeight: 700,
              fontSize: 72,
              color: "#D7221F",
              opacity: 0.35,
              transform: "rotate(-18deg)",
            }}
          >
            {draftWatermark}
          </Text>
        ) : null}
      </Page>
    </Document>
  );
};

