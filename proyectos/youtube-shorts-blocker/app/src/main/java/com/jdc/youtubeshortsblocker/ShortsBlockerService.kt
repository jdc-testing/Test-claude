package com.jdc.youtubeshortsblocker

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class ShortsBlockerService : AccessibilityService() {

    companion object {
        var isRunning = false
        private const val YOUTUBE_PACKAGE = "com.google.android.youtube"
        private val SHORTS_CLASS_PATTERNS = listOf(
            "shorts", "reel", "shortspivot", "reelwatch", "shortslandingfragment"
        )
    }

    override fun onServiceConnected() {
        isRunning = true
        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                         AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
                         AccessibilityEvent.TYPE_VIEW_CLICKED
            packageNames = arrayOf(YOUTUBE_PACKAGE)
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            notificationTimeout = 50L
            flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                    AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
        }
        serviceInfo = info
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.packageName?.toString() != YOUTUBE_PACKAGE) return

        // Detección 1: nombre de clase contiene "shorts" o "reel"
        val className = event.className?.toString()?.lowercase() ?: ""
        if (SHORTS_CLASS_PATTERNS.any { className.contains(it) }) {
            performGlobalAction(GLOBAL_ACTION_BACK)
            return
        }

        // Detección 2: el usuario hizo click en el tab "Shorts"
        if (event.eventType == AccessibilityEvent.TYPE_VIEW_CLICKED) {
            val clickedText = event.text.joinToString(" ").lowercase()
            val clickedDesc = event.contentDescription?.toString()?.lowercase() ?: ""
            if (clickedText.contains("shorts") || clickedDesc.contains("shorts")) {
                performGlobalAction(GLOBAL_ACTION_BACK)
                return
            }
        }

        // Detección 3: árbol de UI — tab Shorts activo o seleccionado
        val root = rootInActiveWindow ?: return
        try {
            if (isShortsTabActive(root)) {
                performGlobalAction(GLOBAL_ACTION_BACK)
            }
        } finally {
            root.recycle()
        }
    }

    private fun isShortsTabActive(root: AccessibilityNodeInfo): Boolean {
        val nodes = root.findAccessibilityNodeInfosByText("Shorts") ?: return false
        for (node in nodes) {
            try {
                if (node.isSelected || node.isChecked || node.isFocused) return true
                // Verificar hasta 3 niveles de padres
                var parent: AccessibilityNodeInfo? = node.parent
                var depth = 0
                while (parent != null && depth < 3) {
                    val active = parent.isSelected || parent.isChecked || parent.isFocused
                    val next = parent.parent
                    parent.recycle()
                    parent = next
                    depth++
                    if (active) {
                        parent?.recycle()
                        return true
                    }
                }
                parent?.recycle()
            } finally {
                node.recycle()
            }
        }
        return false
    }

    override fun onInterrupt() {}

    override fun onDestroy() {
        isRunning = false
        super.onDestroy()
    }
}
