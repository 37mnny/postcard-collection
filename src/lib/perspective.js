// Manual homography (perspective transform) implementation — no external CV library.
// We solve for the matrix that maps the OUTPUT rectangle back to the source quad,
// so warping only needs a forward evaluation per output pixel (no matrix inversion).

function solveLinearSystem(A, B) {
  const n = B.length
  const M = A.map((row, i) => [...row, B[i]])

  for (let col = 0; col < n; col++) {
    let pivotRow = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivotRow][col])) pivotRow = r
    }
    ;[M[col], M[pivotRow]] = [M[pivotRow], M[col]]

    const pivot = M[col][col]
    for (let c = col; c <= n; c++) M[col][c] /= pivot

    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const factor = M[r][col]
      if (factor === 0) continue
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c]
    }
  }

  return M.map((row) => row[n])
}

// points: [{x,y}, ...] x4, ordered tl, tr, br, bl
export function getPerspectiveTransform(fromPts, toPts) {
  const A = []
  const B = []
  for (let i = 0; i < 4; i++) {
    const { x: sx, y: sy } = fromPts[i]
    const { x: dx, y: dy } = toPts[i]
    A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx])
    B.push(dx)
    A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy])
    B.push(dy)
  }
  const h = solveLinearSystem(A, B)
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1]
}

function applyHomography(H, x, y) {
  const w = H[6] * x + H[7] * y + H[8]
  return {
    x: (H[0] * x + H[1] * y + H[2]) / w,
    y: (H[3] * x + H[4] * y + H[5]) / w,
  }
}

function sampleBilinear(imageData, x, y, out, outOffset) {
  const { width, height, data } = imageData
  if (x < -1 || y < -1 || x > width || y > height) {
    out[outOffset] = 255
    out[outOffset + 1] = 255
    out[outOffset + 2] = 255
    out[outOffset + 3] = 0
    return
  }
  const cx = Math.min(Math.max(x, 0), width - 1)
  const cy = Math.min(Math.max(y, 0), height - 1)
  const x0 = Math.floor(cx)
  const y0 = Math.floor(cy)
  const x1 = Math.min(x0 + 1, width - 1)
  const y1 = Math.min(y0 + 1, height - 1)
  const dx = cx - x0
  const dy = cy - y0
  const idx = (xx, yy) => (yy * width + xx) * 4

  for (let c = 0; c < 4; c++) {
    const v00 = data[idx(x0, y0) + c]
    const v10 = data[idx(x1, y0) + c]
    const v01 = data[idx(x0, y1) + c]
    const v11 = data[idx(x1, y1) + c]
    const top = v00 * (1 - dx) + v10 * dx
    const bot = v01 * (1 - dx) + v11 * dx
    out[outOffset + c] = top * (1 - dy) + bot * dy
  }
}

// corners: [tl, tr, br, bl] in SOURCE pixel coordinates
export function warpPerspective(srcImageData, corners, outWidth, outHeight) {
  const dstCorners = [
    { x: 0, y: 0 },
    { x: outWidth, y: 0 },
    { x: outWidth, y: outHeight },
    { x: 0, y: outHeight },
  ]
  // Maps an output-space point directly to the matching source-space point.
  const H = getPerspectiveTransform(dstCorners, corners)

  const out = new ImageData(outWidth, outHeight)
  const outData = out.data
  const tmp = [0, 0, 0, 0]

  for (let y = 0; y < outHeight; y++) {
    for (let x = 0; x < outWidth; x++) {
      const { x: sx, y: sy } = applyHomography(H, x + 0.5, y + 0.5)
      sampleBilinear(srcImageData, sx, sy, tmp, 0)
      const o = (y * outWidth + x) * 4
      outData[o] = tmp[0]
      outData[o + 1] = tmp[1]
      outData[o + 2] = tmp[2]
      outData[o + 3] = 255
    }
  }

  return out
}

export function estimateOutputSize(corners, maxLongEdge = 1400) {
  const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y)
  const [tl, tr, br, bl] = corners
  const widthTop = dist(tl, tr)
  const widthBottom = dist(bl, br)
  const heightLeft = dist(tl, bl)
  const heightRight = dist(tr, br)

  let width = Math.round(Math.max(widthTop, widthBottom))
  let height = Math.round(Math.max(heightLeft, heightRight))

  const longEdge = Math.max(width, height)
  if (longEdge > maxLongEdge) {
    const scale = maxLongEdge / longEdge
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  return {
    width: Math.max(width, 40),
    height: Math.max(height, 40),
  }
}
