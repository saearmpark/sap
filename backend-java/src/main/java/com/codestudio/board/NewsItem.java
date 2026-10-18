package com.codestudio.board;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

@Entity
@Table(name = "news_items", uniqueConstraints = @UniqueConstraint(columnNames = "link_hash"))
public class NewsItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(nullable = false, length = 1000)
    private String link;

    @Column(name = "link_hash", nullable = false, length = 64)
    private String linkHash;

    @Column(length = 80)
    private String source;

    @Column(nullable = false, length = 20)
    private String category;

    @Column(length = 500)
    private String summary;

    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    private Instant publishedAt;

    @Column(name = "fetched_at", nullable = false)
    private Instant fetchedAt;

    protected NewsItem() {
    }

    public NewsItem(String title, String link, String linkHash, String source, String category,
                    String summary, String imageUrl, Instant publishedAt, Instant fetchedAt) {
        this.title = title;
        this.link = link;
        this.linkHash = linkHash;
        this.source = source;
        this.category = category;
        this.summary = summary;
        this.imageUrl = imageUrl;
        this.publishedAt = publishedAt;
        this.fetchedAt = fetchedAt;
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getLink() {
        return link;
    }

    public String getLinkHash() {
        return linkHash;
    }

    public String getSource() {
        return source;
    }

    public String getCategory() {
        return category;
    }

    public String getSummary() {
        return summary;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public Instant getFetchedAt() {
        return fetchedAt;
    }
}
